import React from 'react';

function ErrorMessage({ message }) {
  return <div className="error-message">エラー: {message}</div>;
}

export default ErrorMessage;