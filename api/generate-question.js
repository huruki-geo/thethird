// /api/generate-question.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// Vercelの環境変数からAPIキーを取得
// 重要: `process.env.変数名` でアクセス
const apiKey = process.env.VITE_GEMINI_API_KEY; // または単に GEMINI_API_KEY としても良い

// APIキーがない場合はエラーレスポンスを返す
if (!apiKey) {
  console.error("サーバーレス関数でAPIキーが見つかりません");
  return new Response(JSON.stringify({ error: "サーバー設定エラー: APIキーがありません。" }), {
    status: 500, // Internal Server Error
    headers: { 'Content-Type': 'application/json' },
  });
}

// Geminiクライアントの初期化 (関数ハンドラの外で行うことで再利用)
let genAI;
let model;
try {
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-latest",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });
} catch (initError) {
  console.error("Geminiクライアント初期化エラー:", initError);
  // 初期化に失敗した場合もエラーレスポンス
  return new Response(JSON.stringify({ error: "サーバー設定エラー: Geminiクライアントを初期化できません。" }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}


// Vercelのサーバーレス関数のハンドラ
// `export default` で関数をエクスポートする
export default async function handler(request) {
  // POSTメソッド以外は許可しない
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POSTメソッドのみ許可されています' }), {
      status: 405, // Method Not Allowed
      headers: { 'Allow': 'POST', 'Content-Type': 'application/json' },
    });
  }

  try {
    // リクエストボディ (JSON) をパース
    // VercelのRequestオブジェクトはWeb標準のRequestに近い
    const { prompt } = await request.json();

    // プロンプトが空でないかチェック
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return new Response(JSON.stringify({ error: '有効なプロンプトが必要です' }), {
        status: 400, // Bad Request
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Gemini APIを呼び出し
    console.log("サーバーレス関数: Gemini API呼び出し開始..."); // ログを追加
    const result = await model.generateContent(prompt);
    const response = result.response;
    console.log("サーバーレス関数: Gemini API呼び出し成功");

    // APIからの応答テキスト (JSON文字列のはず) をクライアントに返す
    // Content-Typeを正しく設定することが重要
    return new Response(response.text(), {
      status: 200, // OK
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("サーバーレス関数エラー:", error);

    let errorMessage = "問題の生成中にサーバー側でエラーが発生しました。";
    let statusCode = 500; // Internal Server Error (デフォルト)

    // エラーの種類に応じたハンドリング
    if (error instanceof SyntaxError) {
      errorMessage = "リクエストの形式が無効です。JSONを確認してください。";
      statusCode = 400; // Bad Request
    } else if (error.message.includes('SAFETY')) {
      errorMessage = "コンテンツ生成がセーフティフィルターによりブロックされました。";
      statusCode = 400; // Bad Request (または他の適切なコード)
    } else if (error.message.includes('quota')) {
      errorMessage = "APIの利用上限に達した可能性があります。";
      statusCode = 429; // Too Many Requests
    } else if (error.message.includes('API key not valid')) {
        errorMessage = "サーバーに設定されたAPIキーが無効です。";
        statusCode = 500; // Internal Server Error
    }
    // Gemini APIクライアントライブラリが投げる可能性のある他のエラーも考慮

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}