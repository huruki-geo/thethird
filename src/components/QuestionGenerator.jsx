import React, { useState, /* useMemoは不要になるかも */ } from 'react';
// import { GoogleGenerativeAI } from "@google/generative-ai"; // <-- 不要になる
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import QuestionDisplay from './QuestionDisplay';

// APIキーとモデル初期化はサーバーレス関数で行うため、ここでは不要
// const apiKey = ...
// let genAI; ...

// JSONスキーマ定義はプロンプト内で使うので残しても良いが、必須ではない
const questionSchema = {
  type: "object",
  properties: {
    "Leading Sentence": { type: "string", description: "問題の導入となるリード文。具体的な歴史的事象や文脈を含むこと。" },
    "Questions": { type: "array", items: { type: "string" }, description: "リード文に関連する設問のリスト。最低2つ以上。" },
    "Answers": { type: "array", items: { type: "string" }, description: "各設問に対応する解答のリスト。Questionsと同じ順序・数であること。" },
    "different_answers": { type: "array", items: { type: "string" }, description: "解答の別解や許容される表現のリスト（任意）。各要素は「問X: [別解]」のように記述する。" },
    "Explaination": { type: "string", description: "問題全体の背景や、各設問・解答に関する詳細な解説。改行を含めて記述する。" }, // スキーマのキー名に注意
    "Theme": { type: "string", description: "問題が扱う主要なテーマ、時代、地域など。" }
  },
  "required": ["Leading Sentence", "Questions", "Answers", "Explaination", "Theme"]
};

function QuestionGenerator() {
  const [userInput, setUserInput] = useState('');
  const [generatedQuestion, setGeneratedQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (event) => {
    setUserInput(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!userInput.trim()) {
      setError("テーマを入力してください。");
      return;
    }
    if (loading) return;

    setLoading(true);
    setError(null);
    setGeneratedQuestion(null);

    // プロンプトの組み立て (ここで行う)
    const prompt = `
      あなたは東京大学の世界史入試問題を作成する専門家です。
      以下の指示とJSONスキーマに従って、指定されたテーマに関する一問一答形式の問題を作成してください。

      指示:
      - 形式: 示唆に富むリード文300字（Leading Sentence）があり、それに関連して、100字程度の文章で必ず一つの答えに特定された単語のみを答えさせる問題を10問（Questions）とその解答（Answers）を作成してください。それぞれの問題は、多少リード文から飛躍しても、時代・地域のバランスが妥当になるようにしてください。
      - テーマ: ${userInput}
      - 問題の例:19世紀末、アメリカとの戦争（米西戦争）の結果、フィリピンの独立を宣言したが、その後アメリカの支配に抵抗してフィリピン＝アメリカ戦争を戦った革命の指導者は誰か。 回答:アギナルド
      - 特徴:中国史、遊牧民族史をあわせて2題以上、文化史を1題以上含めてください。
      -注意:①難易度は東大入試レベルで、やや難しい問題を1問程度入れてください　②3問程度、へんなリード文、その人物のマイナーなエピソード、変わった語り口 (モンケのことを、ルブルックとあったモンゴルの王として聞くなど)を試みてください
      - 解答: 各設問に対する解答は簡潔かつ正確に記述してください。
      - 解説: 問題全体の背景、リード文の意図、各設問のポイント、解答の根拠などを簡潔に記述してください。改行も適宜使用してください。
      - 別解: 表記ゆれがある場合はdifferent_answersに含めてください。(フランクリン・ルーズベルトとフランクリン・ローズヴェルト、ウェストファリア条約とウェストヴァーレン条約など)
      - JSONスキーマ: 以下のスキーマに厳密に従ってJSON形式で出力してください。必須項目は必ず含めてください。

      JSONスキーマ:
      ${JSON.stringify(questionSchema)}
    `;

    try {
      // ★★★ サーバーレス関数へのPOSTリクエスト ★★★
      const apiResponse = await fetch('/api/generate-question', { // エンドポイントを指定
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // プロンプトをJSONボディで送信
        body: JSON.stringify({ prompt: prompt }),
      });

      // レスポンスのステータスコードをチェック
      if (!apiResponse.ok) {
        // サーバーからのエラーレスポンスを取得試行
        let errorData = { error: `サーバーエラー (${apiResponse.status})` };
        try {
          errorData = await apiResponse.json(); // エラーメッセージがJSON形式で返されていることを期待
        } catch (parseError) {
          console.error("サーバーエラーレスポンスのパース失敗:", parseError);
          // パース失敗時はステータスコードに基づくメッセージ
        }
        // new Error() にサーバーからのエラーメッセージを入れる
        throw new Error(errorData.error || `サーバーエラーが発生しました (${apiResponse.status})`);
      }

      // 成功レスポンスをJSONとしてパース
      const jsonOutput = await apiResponse.json();

      // 簡単なバリデーション (必須項目があるか) - これは継続しても良い
      if (!jsonOutput["Leading Sentence"] || !jsonOutput.Questions || !jsonOutput.Answers || !jsonOutput.Explaination || !jsonOutput.Theme) {
        throw new Error("生成されたデータに必要な項目が不足しています。");
      }
      if (jsonOutput.Questions.length !== jsonOutput.Answers.length) {
         console.warn("設問と解答の数が一致しません。出力:", jsonOutput);
      }

      setGeneratedQuestion(jsonOutput);

    } catch (err) {
      console.error("フロントエンドエラー:", err);
      // fetch自体のネットワークエラーか、サーバーからのエラーメッセージを表示
      setError(err.message || "問題の生成中に不明なエラーが発生しました。");
      setGeneratedQuestion(null);
    } finally {
      setLoading(false);
    }
  };

  // APIキーの有無はフロントエンドではもうチェック不要
  // const apiKeyWarning = ...

  return (
    <div>
      {/* {apiKeyWarning} <-- 削除 */}
      <form onSubmit={handleSubmit} className="input-form">
        <textarea
          value={userInput}
          onChange={handleInputChange}
          placeholder="問題を作成したいテーマや時代、地域、キーワードなどを入力してください..."
          rows={4}
          // disabled={!apiKey} <-- APIキーチェック不要なので削除
        />
        <button type="submit" disabled={loading || !userInput.trim() /* || !apiKey */}>
          {loading ? '生成中...' : '東大世界史レベルの問題を生成'}
        </button>
      </form>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      {generatedQuestion && <QuestionDisplay data={generatedQuestion} />}

      {/* デバッグ用表示 */}
      {/* {generatedQuestion && <pre>{JSON.stringify(generatedQuestion, null, 2)}</pre>} */}
    </div>
  );
}

export default QuestionGenerator;