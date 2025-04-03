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
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return new Response(JSON.stringify({ error: '有効なプロンプトが必要です' }), {
        status: 400, // Bad Request
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ★ 初期化済みの modelInstance を使用 ★
    console.log("サーバーレス関数: Gemini API呼び出し開始...");
    const result = await modelInstance.generateContent(prompt);
    const response = result.response;
    console.log("サーバーレス関数: Gemini API呼び出し成功");

    return new Response(response.text(), {
      status: 200, // OK
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("リクエスト処理中のエラー:", error);
    let errorMessage = "問題の生成中にサーバー側でエラーが発生しました。";
    let statusCode = 500;

    // エラーの種類に応じたハンドリング (既存のコード)
    if (error instanceof SyntaxError) { /* ... */ }
    else if (error.message) { /* ... */ }
    // ...

    const errorResponse = { error: errorMessage };
    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}