// /api/generate-question.js

console.log(`[${new Date().toISOString()}] MODULE START: /api/generate-question.js`);
import { GoogleGenerativeAI } from "@google/generative-ai";



// --- ハンドラ関数 ---
export default async function handler(request) {
    
// グローバルスコープでクライアントインスタンスと初期化エラーを保持
let genAIInstance = null;
let modelInstance = null;
let initializationError = null; // 初期化エラーが発生した場合にセットする

// --- 初期化処理 ---
// モジュールがロードされたときに一度だけ実行される
    try {
        console.log(`[${new Date().toISOString()}] クライアント初期化開始...`); // ★追加
      const initStartTime = Date.now(); // ★追加
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
      const initEndTime = Date.now(); // ★追加
      console.log(`[${new Date().toISOString()}] クライアント初期化完了。所要時間: ${(initEndTime - initStartTime) / 1000}秒`); // ★追加
      console.log("Geminiクライアントの初期化に成功しました。");
    } catch (error) {
      console.error("Geminiクライアントの初期化中にエラーが発生しました:", error);
      // ★ 発生したエラーを保持 ★
      initializationError = error;
      // ★ ここでは return new Response(...) しない ★
    }
    // --- 初期化処理ここまで ---
  // ★ ハンドラの最初に初期化エラーをチェック ★
  console.log(`[${new Date().toISOString()}] Simple test function invoked.`);
  const responseData = { message: "Simple test successful!" };
  console.log(`[${new Date().toISOString()}] Returning simple response.`);
  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}