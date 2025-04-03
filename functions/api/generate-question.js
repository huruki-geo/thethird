// functions/api/generate-question.js

import { GoogleGenerativeAI } from "@google/generative-ai";

// Pages Functions では、環境変数(Secrets含む)は `context.env` でアクセス
export async function handleRequest(context) {
  const { request, env } = context;

  // POSTメソッド以外はエラー
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POSTメソッドのみ許可されています' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // APIキーを環境変数(Secret)から取得
  const apiKey = env.GEMINI_API_KEY; // ★ Cloudflare Pagesで設定するSecret名
  if (!apiKey) {
    console.error("Pages Functions環境変数にGEMINI_API_KEYが設定されていません。");
    return new Response(JSON.stringify({ error: "サーバー設定エラー: APIキーがありません。" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ★ Geminiクライアントの初期化 (リクエスト毎に行うのが無難)
  let genAI;
  let model;
  try {
    console.log(`[${new Date().toISOString()}] クライアント初期化開始...`); // ログ追加
    const initStartTime = Date.now();
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    const initEndTime = Date.now();
    console.log(`[${new Date().toISOString()}] クライアント初期化完了。所要時間: ${(initEndTime - initStartTime) / 1000}秒`);
  } catch (initError) {
    console.error("Geminiクライアント初期化エラー:", initError);
    return new Response(JSON.stringify({ error: `サーバー初期化エラー: ${initError.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // リクエストボディ(JSON)を取得 (RequestオブジェクトはWeb標準)
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return new Response(JSON.stringify({ error: '有効なプロンプトが必要です' }), {
        status: 400, // Bad Request
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Gemini API呼び出し
    console.log(`[${new Date().toISOString()}] Gemini API呼び出し開始...`);
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const response = result.response;
    const endTime = Date.now();
    console.log(`[${new Date().toISOString()}] Gemini API呼び出し成功。所要時間: ${(endTime - startTime) / 1000}秒`);

    const responseText = response.text(); // JSON文字列を取得
    console.log(`[${new Date().toISOString()}] レスポンスサイズ: ${responseText.length} 文字`);
    console.log(`[${new Date().toISOString()}] レスポンスオブジェクトを生成して返却処理を開始します...`); // 最終ログ

    // 成功レスポンスを返す (Web標準のResponseオブジェクト)
    return new Response(responseText, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Pages Functionエラー:", error);
    let errorMessage = "関数でエラーが発生しました。";
    let statusCode = 500;
    // エラーハンドリング (Vercelの時と同様)
    if (error instanceof SyntaxError) { errorMessage = "リクエスト形式が無効です。"; statusCode = 400; }
    else if (error.message?.includes('SAFETY')) { errorMessage = "セーフティフィルターによりブロック。"; statusCode = 400; }
    // ... 他のエラーハンドリング ...
    else if (error.message) { errorMessage = `サーバーエラー: ${error.message}`; }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Pages Functions では、ハンドラ関数を `onRequestPost`, `onRequestGet`, `onRequest` などとしてエクスポートする
export const onRequestPost = async (context) => {
  return handleRequest(context);
};

// 必要であれば OPTIONS メソッド用のハンドラも定義 (通常Pages Functionsでは不要な場合が多い)
// export const onRequestOptions = async (context) => {
//   // CORSプリフライト用レスポンスを返す
//   return new Response(null, {
//     status: 204,
//     headers: {
//       'Access-Control-Allow-Origin': '*', // 必要に応じて制限
//       'Access-Control-Allow-Methods': 'POST, OPTIONS',
//       'Access-Control-Allow-Headers': 'Content-Type',
//       'Access-Control-Max-Age': '86400', // プリフライト結果のキャッシュ時間
//     },
//   });
// };

// フォールバックや他のメソッドを扱う場合
// export const onRequest = async (context) => {
//   if (context.request.method === 'POST') {
//     return handleRequest(context);
//   } else if (context.request.method === 'OPTIONS') {
//     // OPTIONS処理
//   }
//   return new Response('メソッドが許可されていません', { status: 405 });
// };