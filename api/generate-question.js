// /api/generate-question.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// グローバルスコープでクライアントインスタンスと初期化エラーを保持
let genAIInstance = null;
let modelInstance = null;
let initializationError = null; // 初期化エラーが発生した場合にセットする

// --- 初期化処理 ---
// モジュールがロードされたときに一度だけ実行される
try {
  const apiKey = process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    // ★ エラーをスローするか、エラーオブジェクトをセット ★
    throw new Error("サーバー設定エラー: APIキーが見つかりません。Vercelの環境変数を確認してください。");
  }
  genAIInstance = new GoogleGenerativeAI(apiKey);
  modelInstance = genAIInstance.getGenerativeModel({
    model: "gemini-1.5-flash-latest",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });
  console.log("Geminiクライアントの初期化に成功しました。");
} catch (error) {
  console.error("Geminiクライアントの初期化中にエラーが発生しました:", error);
  // ★ 発生したエラーを保持 ★
  initializationError = error;
  // ★ ここでは return new Response(...) しない ★
}
// --- 初期化処理ここまで ---


// --- ハンドラ関数 ---
export default async function handler(request) {
  // ★ ハンドラの最初に初期化エラーをチェック ★
  if (initializationError) {
    // 初期化に失敗していた場合は、ここでエラーレスポンスを返す
    console.error("初期化エラーのためリクエストを処理できません:", initializationError);
    return new Response(JSON.stringify({
        // initializationError.message があればそれを使う
        error: `サーバー初期化エラー: ${initializationError.message || '詳細不明'}`
    }), {
      status: 500, // Internal Server Error
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ★ クライアントインスタンスが正常に作成されているかも念のためチェック ★
  if (!genAIInstance || !modelInstance) {
     console.error("クライアントインスタンスが利用できません。");
     return new Response(JSON.stringify({ error: "サーバー内部エラー: APIクライアントが利用できません。" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // --- これ以降は通常のリクエスト処理 ---

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POSTメソッドのみ許可されています' }), {
      status: 405, // Method Not Allowed
      headers: { 'Allow': 'POST', 'Content-Type': 'application/json' },
    });
  }

  try {
    // ▼▼▼ リクエストボディのパース方法を修正 ▼▼▼
    let body = '';
    // Node.jsのストリームとしてデータを読み取る
    // request オブジェクトは AsyncIterable であることを期待
    for await (const chunk of request) {
      body += Buffer.isBuffer(chunk) ? chunk.toString() : chunk; // Bufferなら文字列に変換
    }

    // ボディが空でないかチェック
    if (!body) {
      console.error("リクエストボディが空です。");
      return new Response(JSON.stringify({ error: 'リクエストボディが空です' }), {
        status: 400, // Bad Request
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 読み取ったボディ文字列をJSONとしてパース
    const requestData = JSON.parse(body);
    const { prompt } = requestData; // パースしたオブジェクトから prompt を取得
    // ▲▲▲ 修正ここまで ▲▲▲

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      console.error("リクエストに有効なプロンプトが含まれていません。", requestData);
      return new Response(JSON.stringify({ error: '有効なプロンプトが必要です' }), {
        status: 400, // Bad Request
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ... (Gemini API呼び出し処理はそのまま) ...
    console.log("サーバーレス関数: Gemini API呼び出し開始...");
    const result = await modelInstance.generateContent(prompt);
    const response = result.response;
    console.log("サーバーレス関数: Gemini API呼び出し成功");

    // APIからの応答テキスト (JSON文字列のはず) をクライアントに返す
    // Content-Typeを正しく設定することが重要
    return new Response(response.text(), {
      status: 200, // OK
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("リクエスト処理中のエラー:", error); // ★エラーログは重要★

    let errorMessage = "問題の生成中にサーバー側でエラーが発生しました。";
    let statusCode = 500;

    // ★ JSON.parse() 失敗時のエラーハンドリングを追加 ★
    if (error instanceof SyntaxError && error.message.includes('JSON.parse')) {
        errorMessage = "リクエストボディの形式が無効です。有効なJSONではありません。";
        statusCode = 400; // Bad Request
    }
    // ... (既存のエラーハンドリング) ...
    else if (error.message) { /* ... */ }

    const errorResponse = { error: errorMessage };
    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}