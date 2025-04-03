import React from 'react';
import QuestionGenerator from './components/QuestionGenerator';
import './App.css'; // スタイルをインポート

function App() {
  return (
    <div className="app-container">
      <h1>東大世界史 一問一答ジェネレーター (Gemini API)</h1>
      <QuestionGenerator />
    </div>
  );
}

export default App;