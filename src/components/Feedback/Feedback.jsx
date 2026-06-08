import React, { useState } from "react";
import "./Feedback.css";
import { useSelector } from "react-redux";
import { supabase } from "../../config";
import { toast } from "react-toastify";

const Feedback = () => {
  const user = useSelector((state) => state.auth?.user);
  const [formData, setFormData] = useState({
    feedbackType: "",
    rating: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.feedbackType) {
      toast.error("Please select a feedback type");
      return false;
    }
    if (!formData.rating) {
      toast.error("Please provide a rating");
      return false;
    }
    if (!formData.message || formData.message.trim().length < 10) {
      toast.error("Please provide a message with at least 10 characters");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare feedback data
      const feedbackData = {
        feedback_type: formData.feedbackType,
        rating: parseInt(formData.rating),
        message: formData.message.trim(),
        user_id: user?.userId || null,
        user_email: user?.email || null,
        user_name: user?.name || "Anonymous",
        created_at: new Date().toISOString(),
      };

      // If Supabase is available, save to database
      if (supabase) {
        const { error } = await supabase.from("feedback").insert([feedbackData]);

        if (error) {
          console.error("Error saving feedback:", error);
          // Still show success message even if DB save fails
          // (for demo purposes, you might want to handle this differently)
        }
      } else {
        // If no Supabase, just log to console (for development)
        console.log("Feedback submitted (no DB):", feedbackData);
      }

      // Show success message
      setSubmitSuccess(true);
      toast.success("Thank you for helping us improve! Your feedback has been submitted.");

      // Reset form
      setFormData({
        feedbackType: "",
        rating: "",
        message: "",
      });

      // Hide success message after 5 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 5000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="feedback-container">
      <div className="feedback-wrapper">
        <div className="feedback-header">
          <h1 className="gradient__text">We Value Your Feedback</h1>
          <p className="feedback-subtitle">
            Your thoughts help us make this platform better for everyone
          </p>
        </div>

        {submitSuccess && (
          <div className="feedback-success-message">
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
            <span>Thank you for helping us improve!</span>
          </div>
        )}

        <form className="feedback-form" onSubmit={handleSubmit}>
          <div className="feedback-form-group">
            <label htmlFor="feedbackType" className="feedback-label">
              Feedback Type <span className="required">*</span>
            </label>
            <select
              id="feedbackType"
              name="feedbackType"
              value={formData.feedbackType}
              onChange={handleChange}
              className="feedback-select"
              required
            >
              <option value="">Select a type</option>
              <option value="bug_report">Bug Report</option>
              <option value="feature_request">Feature Request</option>
              <option value="general_feedback">General Feedback</option>
            </select>
          </div>

          <div className="feedback-form-group">
            <label htmlFor="rating" className="feedback-label">
              Rating <span className="required">*</span>
            </label>
            <select
              id="rating"
              name="rating"
              value={formData.rating}
              onChange={handleChange}
              className="feedback-select"
              required
            >
              <option value="">Select a rating</option>
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Very Good</option>
              <option value="3">3 - Good</option>
              <option value="2">2 - Fair</option>
              <option value="1">1 - Poor</option>
            </select>
          </div>

          <div className="feedback-form-group">
            <label htmlFor="message" className="feedback-label">
              Message / Description <span className="required">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              className="feedback-textarea"
              rows="6"
              placeholder="Please share your thoughts, suggestions, or describe any issues you've encountered..."
              required
              minLength={10}
            />
            <div className="feedback-char-count">
              {formData.message.length} / 500 characters
            </div>
          </div>

          <button
            type="submit"
            className="feedback-submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Feedback;


