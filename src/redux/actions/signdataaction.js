import { supabase } from "../../config";

import {
  ADD_SIGN_DATA_FAIL,
  ADD_SIGN_DATA_REQ,
  ADD_SIGN_DATA_SUCCESS,
  GET_SIGN_DATA_REQ,
  GET_SIGN_DATA_SUCCESS,
  GET_TOP_USERS_REQ,
  GET_TOP_USERS_SUCCESS,
} from "../action-types";
import Cookies from "js-cookie";

export const getSignData = () => async (dispatch) => {
  try {
    dispatch({
      type: GET_SIGN_DATA_REQ,
    });

    if (!supabase) {
      // Return empty data if supabase is not configured
      dispatch({
        type: GET_SIGN_DATA_SUCCESS,
        payload: [],
      });
      return;
    }

    const userCookie = Cookies.get("sign-language-ai-user");
    if (!userCookie) {
      // Return empty data if user is not logged in
      dispatch({
        type: GET_SIGN_DATA_SUCCESS,
        payload: [],
      });
      return;
    }

    const logedInUser = JSON.parse(userCookie);

    console.log("Fetching data for user:", logedInUser.userId);

    // Fetch data from Supabase
    const { data, error } = await supabase
      .from("SignData")
      .select("*")
      .eq("userId", logedInUser.userId);

    console.log("Supabase response - data:", data, "error:", error);

    if (error) {
      // If table doesn't exist (404) or other error, return empty data
      console.warn("Error fetching sign data:", error.message);
      dispatch({
        type: GET_SIGN_DATA_SUCCESS,
        payload: [],
      });
      return;
    }

    console.log("Fetched sign data:", data);

    dispatch({
      type: GET_SIGN_DATA_SUCCESS,
      payload: data || [],
    });
  } catch (error) {
    console.error("Error in getSignData:", error);
    // Return empty data on error instead of failing
    dispatch({
      type: GET_SIGN_DATA_SUCCESS,
      payload: [],
    });
  }
};

export const addSignData = (data) => async (dispatch) => {
  try {
    dispatch({
      type: ADD_SIGN_DATA_REQ,
    });

    console.log("Attempting to save data:", data);

    if (!supabase) {
      console.error("Supabase not configured!");
      throw new Error("Database not configured. Please check your .env file.");
    }

    // Insert data into Supabase
    const { data: insertedData, error } = await supabase.from("SignData").insert([
      {
        userId: data.userId,
        id: data.id,
        username: data.username,
        createdAt: data.createdAt,
        signsPerformed: data.signsPerformed,
        secondsSpent: data.secondsSpent,
      },
    ]).select();

    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }

    console.log("Data saved successfully:", insertedData);

    dispatch({
      type: ADD_SIGN_DATA_SUCCESS,
      payload: data,
    });
  } catch (error) {
    console.error("Error saving data:", error);
    dispatch({
      type: ADD_SIGN_DATA_FAIL,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message,
    });
  }
};

export const getTopUsers = () => async (dispatch) => {
  try {
    dispatch({
      type: GET_TOP_USERS_REQ,
    });

    if (!supabase) {
      // Return empty data if supabase is not configured
      dispatch({
        type: GET_TOP_USERS_SUCCESS,
        payload: [],
      });
      return;
    }

    // Fetch all data from Supabase
    const { data: allData, error } = await supabase
      .from("SignData")
      .select("*");

    if (error) {
      // If table doesn't exist (404) or other error, return empty data
      console.warn("Error fetching top users:", error.message);
      dispatch({
        type: GET_TOP_USERS_SUCCESS,
        payload: [],
      });
      return;
    }

    // Handle empty data
    if (!allData || allData.length === 0) {
      dispatch({
        type: GET_TOP_USERS_SUCCESS,
        payload: [],
      });
      return;
    }

    // group data by username
    const groupedData = allData.reduce((acc, curr) => {
      if (!acc[curr.username]) {
        acc[curr.username] = [];
      }
      acc[curr.username].push(curr);
      return acc;
    }, {});

    // get maximum count object for each group
    let uniqueData = Object.values(groupedData).map((group) => {
      return group.reduce((maxObj, obj) => {
        return obj.signsPerformed.reduce((acc, curr) => acc + curr.count, 0) >
          maxObj.signsPerformed.reduce((acc, curr) => acc + curr.count, 0)
          ? obj
          : maxObj;
      });
    });

    uniqueData.sort(
      (a, b) =>
        b.signsPerformed.reduce((acc, curr) => acc + curr.count, 0) -
        a.signsPerformed.reduce((acc, curr) => acc + curr.count, 0)
    );

    uniqueData = uniqueData.slice(0, 3);

    // add rank property to each object
    uniqueData.forEach((obj, index) => {
      obj.rank = index + 1;
    });

    // create new array with only name and rank properties
    const dataForRankBoard = uniqueData.map((obj) => ({
      username: obj.username,
      rank: obj.rank,
    }));

    dispatch({
      type: GET_TOP_USERS_SUCCESS,
      payload: dataForRankBoard,
    });
  } catch (error) {
    console.error("Error in getTopUsers:", error);
    // Return empty data on error instead of failing
    dispatch({
      type: GET_TOP_USERS_SUCCESS,
      payload: [],
    });
  }
};
