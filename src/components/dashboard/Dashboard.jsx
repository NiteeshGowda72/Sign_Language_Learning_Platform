/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import "./Dashboard.css";
import { useDispatch, useSelector } from "react-redux";
import { getSignData, getTopUsers } from "../../redux/actions/signdataaction";
import ChartComp from "./Chart/ChartComp";
import { supabase } from "../../config";

import GoldTrophy from "../../assests/gold.png";
import SilverTrophy from "../../assests/silver.png";
import BronzeTrophy from "../../assests/bronze.png";
import NoData from "../../assests/No-data.svg";

import Spinner from "../Spinner/Spinner";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const dispatch = useDispatch();
 
  const navigate = useNavigate();

  const { loading: authLoader ,accessToken } = useSelector((state) => state.auth);
  const user = useSelector((state) => state.auth?.user);
  const { signDataList, loading } = useSelector((state) => state.signData);
  
  const [activitySummary, setActivitySummary] = useState({
    signsPracticed: 0,
    lastPracticedSign: "None",
  });

  useEffect(() => {
    if (!authLoader && !accessToken) {
      navigate("/");
    }
    dispatch(getSignData());
    dispatch(getTopUsers());
  }, [accessToken, authLoader, navigate,dispatch]);

  useEffect(() => {
    dispatch(getSignData());
    dispatch(getTopUsers());
  }, [dispatch]);

  // Load activity summary - Calculate from all sessions
  useEffect(() => {
    const calculateActivitySummary = () => {
      if (!signDataList || signDataList.length === 0) {
        setActivitySummary({
          signsPracticed: 0,
          lastPracticedSign: "None",
        });
        return;
      }

      // Calculate total signs practiced across ALL sessions
      let totalSignsPracticed = 0;
      let lastPracticedSign = "None";
      let mostRecentSession = null;
      let latestTimestamp = null;

      // Iterate through all sessions
      signDataList.forEach((session) => {
        if (session.signsPerformed && Array.isArray(session.signsPerformed)) {
          // Sum up all signs in this session
          const sessionTotal = session.signsPerformed.reduce(
            (sum, sign) => sum + (sign.count || 0),
            0
          );
          totalSignsPracticed += sessionTotal;

          // Find the most recent session by comparing createdAt timestamps
          if (session.createdAt) {
            let sessionTime;
            try {
              sessionTime = new Date(session.createdAt).getTime();
              // Check if date is valid
              if (isNaN(sessionTime)) {
                // Try parsing as string if direct Date conversion fails
                sessionTime = Date.parse(session.createdAt);
              }
            } catch (e) {
              console.warn("Invalid createdAt date:", session.createdAt);
              sessionTime = 0;
            }

            if (sessionTime && (!latestTimestamp || sessionTime > latestTimestamp)) {
              latestTimestamp = sessionTime;
              mostRecentSession = session;
            }
          }
        }
      });

      // Get the last practiced sign from the most recent session
      // Note: signsPerformed is sorted by frequency (highest first) in Detect component
      // So the first sign is the most frequently practiced in that session
      // For "last practiced sign", we use the first sign from the most recent session
      // as it represents the primary sign from the latest practice session
      if (mostRecentSession && mostRecentSession.signsPerformed && Array.isArray(mostRecentSession.signsPerformed)) {
        if (mostRecentSession.signsPerformed.length > 0) {
          // Get the first sign (most frequently practiced in the most recent session)
          const firstSign = mostRecentSession.signsPerformed[0];
          if (firstSign && firstSign.SignDetected) {
            lastPracticedSign = firstSign.SignDetected;
          }
        }
      }

      setActivitySummary({
        signsPracticed: totalSignsPracticed,
        lastPracticedSign: lastPracticedSign,
      });
    };

    calculateActivitySummary();
  }, [signDataList]); // Update when signDataList changes

  const { topUsers } = useSelector((state) => state.topUsers);

  //create a new object array which contains only signs performed array
  const list = signDataList
    .map((data) => data?.signsPerformed)
    .filter((signsPerformed) => signsPerformed && Array.isArray(signsPerformed))
    .reduce((acc, val) => acc.concat(val), [])
    .filter((item) => item && item.SignDetected); // Filter out undefined/null items

  //add the counts of same sign values
  const newData = [];
  for (let i = 0; i < list.length; i++) {
    if (!list[i] || !list[i].SignDetected) {
      continue; // Skip invalid entries
    }
    const foundIndex = newData.findIndex(
      (d) => d.SignDetected === list[i].SignDetected
    );
    if (foundIndex === -1) {
      newData.push({ ...list[i] });
    } else {
      newData[foundIndex].count += list[i].count || 0;
    }
  }

  const TopFiveSignsObject = newData
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Check if we have any data
  const hasData = signDataList && signDataList.length > 0;

  return (
    <div className="signlang_dashboard-container">
      {!(loading || authLoader) ? (
        <>
          {/* Activity Summary Section */}
          <div className="signlang_activity-summary">
            <h2 className="gradient__text">Activity Summary</h2>
            <div className="signlang_activity-cards">
              <div className="signlang_activity-item">
                <div className="signlang_activity-icon">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <div className="signlang_activity-info">
                  <span className="signlang_activity-label">Signs Practiced</span>
                  <span className="signlang_activity-value">
                    {activitySummary.signsPracticed}
                  </span>
                </div>
              </div>
              <div className="signlang_activity-item">
                <div className="signlang_activity-icon">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <div className="signlang_activity-info">
                  <span className="signlang_activity-label">Last Practiced Sign</span>
                  <span className="signlang_activity-value">
                    {activitySummary.lastPracticedSign}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="signlang_header-data">
            {hasData ? (
              <ChartComp signDataList={signDataList} />
            ) : (
              <div className="signlang_chart-placeholder">
                <h2 className="gradient__text">Your Progress Chart</h2>
                <p>Start practicing in the Detect section to see your progress here!</p>
              </div>
            )}

            <div className="signlang_leader-board">
              <h2 className="gradient__text title">Our Top Users</h2>
              <div className="signlang_toprank-box">
                {topUsers && topUsers.length > 0 ? (
                  topUsers.map((user, index) => (
                    <div className="signlang_tank-row" key={index * 786}>
                      <h2 className="gradient__text">{user.rank}</h2>
                      <h3>{user.username}</h3>
                      <img
                        src={
                          user.rank === 1
                            ? GoldTrophy
                            : user.rank === 2
                            ? SilverTrophy
                            : user.rank === 3
                            ? BronzeTrophy
                            : ""
                        }
                        alt="trophy"
                      />
                    </div>
                  ))
                ) : (
                  <div className="signlang_no-users">
                    <p>Be the first to make it to the leaderboard!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="signlang_dashboard-midsection">
            <div className="signlang_sign-table">
              <h2 className="gradient__text">Your Most Practiced Signs</h2>

              <table>
                <tbody>
                  <tr>
                    <th className="table-heading">Sr.No</th>
                    <th className="table-heading">Signs</th>
                    <th className="table-heading">Frequency</th>
                  </tr>

                  {TopFiveSignsObject && TopFiveSignsObject.length > 0 ? (
                    TopFiveSignsObject.map((data, i) => (
                      <tr key={i * 111} className="sign-row">
                        <td>{i + 1}</td>
                        <td>{data.SignDetected}</td>
                        <td>{data.count} times</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="sign-row">
                      <td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>
                        No signs practiced yet. Go to Detect to start learning!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <Spinner />
      )}
    </div>
  );
};

export default Dashboard;
