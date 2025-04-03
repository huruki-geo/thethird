import React, { useState } from 'react';

function QuestionDisplay({ data }) {
  const [showAnswers, setShowAnswers] = useState(false);

  if (!data) return null;

  const {
    "Leading Sentence": leadingSentence,
    Questions: questions,
    Answers: answers,
    different_answers: differentAnswers,
    Explaination: explanation, // スキーマの 'Explaination' に注意
    Theme: theme,
  } = data;

  const toggleAnswers = () => setShowAnswers(!showAnswers);

  return (
    <div className="question-display">
      {theme && (
        <div className="question-section theme">
          <h3>テーマ</h3>
          <p>{theme}</p>
        </div>
      )}

      {leadingSentence && (
        <div className="question-section leading-sentence">
          <h3>リード文</h3>
          <p>{leadingSentence}</p>
        </div>
      )}

      {questions && questions.length > 0 && (
        <div className="question-section questions">
          <h3>設問</h3>
          <ol>
            {questions.map((q, index) => (
              <li key={index}>{q}</li>
            ))}
          </ol>
        </div>
      )}

      {answers && answers.length > 0 && (
        <div className="question-section answers">
          <h3>解答</h3>
          <button onClick={toggleAnswers} className="answer-toggle">
            {showAnswers ? '解答を隠す' : '解答を表示'}
          </button>
          {showAnswers ? (
            <>
              <ol>
                {answers.map((a, index) => (
                  <li key={index}>{a}</li>
                ))}
              </ol>
              {differentAnswers && differentAnswers.length > 0 && (
                <>
                  <h4>別解・許容解答</h4>
                  <ul>
                    {differentAnswers.map((da, index) => (
                      <li key={index}>{da}</li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <p className="hidden-answers">(解答は非表示です)</p>
          )}
        </div>
      )}

      {explanation && (
        <div className="question-section explanation">
          <h3>解説</h3>
          {/* 改行を<br>に変換して表示 */}
          {explanation.split('\n').map((line, index, arr) => (
              <React.Fragment key={index}>
                {line}
                {index < arr.length - 1 && <br />}
              </React.Fragment>
           ))}
        </div>
      )}
    </div>
  );
}

export default QuestionDisplay;