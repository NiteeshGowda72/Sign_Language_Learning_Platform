import React from "react";
import "./TestScoreboard.css";

const TestScoreboard = ({ results }) => {
  return (
    <div className="test-scoreboard">
      <h2 className="test-scoreboard-title">Scoreboard</h2>
      <table className="test-scoreboard-table">
        <thead>
          <tr>
            <th>SIGN</th>
            <th>ACCURACY (%)</th>
            <th>RESULT</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => (
            <tr key={index}>
              <td className="test-table-sign">{result.sign}</td>
              <td className="test-table-accuracy">
                {result.accuracy}%
              </td>
              <td className={`test-table-result ${result.result.toLowerCase()}`}>
                {result.result}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TestScoreboard;

