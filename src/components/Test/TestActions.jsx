import React from "react";
import { useNavigate } from "react-router-dom";
import "./TestActions.css";

const TestActions = ({ onRetry }) => {
  const navigate = useNavigate();

  return (
    <div className="test-summary-actions">
      <button
        className="test-button primary small"
        onClick={onRetry}
      >
        Retry Test
      </button>
      <button
        className="test-button secondary small"
        onClick={() => navigate("/detect")}
      >
        Go to Practice
      </button>
      <button
        className="test-button secondary small"
        onClick={() => navigate("/")}
      >
        Back to Home
      </button>
    </div>
  );
};

export default TestActions;

