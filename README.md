# Sign Language Learning and Practice Platform

A browser-based sign language learning and practice platform built with React and MediaPipe. It uses webcam input to recognize supported hand gestures and provides interactive practice and test workflows with visual feedback.

The project aims to make practicing supported signs more accessible through a web interface, combining real-time gesture recognition with learning activities.

## Overview

The application brings together webcam capture, MediaPipe gesture recognition, and practice and assessment workflows. The bundled gesture-recognition model is configured for 41 classes: 25 alphabet entries (A–Y, excluding Z) and 16 word/sign classes.

Recognition depends on the supported model classes, camera conditions, hand positioning, and model performance. These class counts describe the configured labels; they do not represent a measured accuracy score. No accuracy percentage is claimed because a reproducible evaluation result has not been documented.

## Key Features

Real-Time Gesture Recognition: Instantaneous recognition of hand gestures using MediaPipe's advanced hand tracking and gesture recognition models.

Interactive Learning System: Three-tier learning approach with guided instruction, hands-on practice, and assessment testing.

Progress Dashboard: View practice activity and available progress statistics.

Recognition Feedback: Displays gesture-recognition results and confidence-related feedback to help users practice supported signs.

User Authentication: Supports email/password authentication and Google sign-in through the configured authentication services.

Confidence Feedback: Displays recognition confidence information to support practice and test workflows.

Responsive Interface: Intuitive and accessible user interface designed for users of all technical skill levels.

Practice and Test Results: The interface includes practice and test workflows, with progress or performance information where supported by the application.

## Technical Architecture

### Front-End Stack

React: Modern JavaScript library for building interactive user interfaces

Redux: State management for predictable application state

React Router: Client-side routing for seamless navigation

Webcam Integration: Real-time video capture and processing

## Back-End Stack

Supabase: PostgreSQL database with real-time capabilities for user data and feedback storage

Google OAuth: Secure authentication and user identity management

## Machine Learning Framework

MediaPipe Tasks Vision: Runs the bundled gesture-recognition task in the browser

Hand Support: The recognizer is configured to process up to two hands

Gesture Classes: The bundled model is documented as containing 41 classes: 25 alphabet entries (A–Y, excluding Z) and 16 word/sign classes. These class counts describe the model labels, not a measured accuracy guarantee.

## Gesture Recognition Workflow

The platform uses a browser-based workflow to recognize supported hand gestures.

1. **Camera Input:** The application requests webcam access to capture the user's hand movements.
2. **Model Initialization:** The application initializes the MediaPipe gesture recognizer using the configured runtime and model options.
3. **Gesture Inference:** Webcam input is processed by the bundled gesture-recognition model to identify supported gesture classes.
4. **Recognition Feedback:** The interface presents recognition results to support the user's practice and test activities.
5. **Learning Workflows:** Practice and test modes provide the interface through which users interact with gesture recognition.

### Recognition Runtime

The MediaPipe runtime URL and gesture-recognition options are centralized in `src/config/vision.js`. The bundled model is stored at:

`src/assests/sign_language_recognizer_25-04-2025.task`

The recognizer's configured classes describe which labels the model supports; they do not guarantee that every gesture will be recognized correctly. Recognition performance can vary with lighting, camera quality, hand positioning, and other input conditions.

## Installation and Setup

### Prerequisites

Node.js and npm installed on your system
A Supabase account and project
Google OAuth credentials
Modern web browser with webcam access

### Installation Steps

1. Clone the repository
   ```bash
   git clone https://github.com/NiteeshGowda72/Sign_Language_Learning_Platform.git
   cd Sign_Language_Learning_Platform
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure environment variables
   Create a `.env` file in the root directory with the following variables:
   ```
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
   ```

4. Start the development server
   ```bash
   npm start
   ```

5. Open your browser and navigate to http://localhost:3000

## Application Features and Workflow

### Home Page

Welcome screen with options to choose between Practice and Test learning modes.

![Home Page](./public/screenshots/home-page.png)

### User Registration

User account creation page with Google OAuth integration for seamless signup.

![Registration Page](./public/screenshots/register-page.png)

### User Login

Secure login interface with email and password authentication or Google login option.

![Login Page](./public/screenshots/login-page.png)

### Practice Mode Instructions

Clear instructions for the practice session with timing requirements and success criteria.

![Practice Instructions](./public/screenshots/practice-Instructions.png)

### Practice Mode – Sign "C" Detection in Progress

Live webcam feed with hand gesture visualization, real-time sign detection showing countdown timer.

![Practice C Detection](./public/screenshots/practice-c-detection.png)

### Practice Mode – Sign "Thank You" Recognition

Practice mode gesture recognition showing the Thank You sign.

![Practice Thank You](./public/screenshots/practice-thankyou.png)

### Practice Mode – Sign "Bye" Recognition

Practice mode gesture recognition showing the Bye sign.

![Practice Bye](./public/screenshots/practice-bye.png)

### Practice Mode – Sign "E" Successfully Completed

Practice mode confirmation screen showing successful sign completion for a selected gesture.

![Practice E Completed](./public/screenshots/practice-e-completed.png)

### Test Instructions

Detailed instructions for the 10-sign test with timing requirements and success criteria.

![Test Instructions](./public/screenshots/test-instructions.png)

### Sign Language Test Interface

Organized test interface showing 10 signs to practice with real-time detection and completion tracking.

![Test Interface](./public/screenshots/test-interface.png)

### Dashboard & Activity Analytics

User activity dashboard showing performance analytics and progress statistics.

![Dashboard](./public/screenshots/dashboard.png)

### User Profile

Comprehensive profile page displaying user information, account details, and progress statistics including total signs practiced, tests taken, best score, and accuracy metrics.

![Profile](./public/screenshots/profile.png)

## Project Technology Stack

### Frontend Dependencies

@mediapipe/drawing_utils: Utilities for visualizing hand landmarks
@mediapipe/hands: Hand detection and tracking
@mediapipe/tasks-vision: Vision task framework
@react-oauth/google: Google authentication
@supabase/supabase-js: Supabase client library
chart.js and react-chartjs-2: Data visualization
react-redux: Redux bindings for React
react-router-dom: Client-side routing
react-webcam: Webcam component
uuid: Unique identifier generation
react-toastify: Notification system

## Developer Information

Developer: Niteesh Gowda C
Email: niteeshgowda7272@gmail.com
GitHub: https://github.com/NiteeshGowda72

## Project Repository

GitHub Repository: https://github.com/NiteeshGowda72

## Reference Documentation

MediaPipe Gesture Recognition: https://developers.google.com/mediapipe/solutions/vision/gesture_recognizer

Supabase Documentation: https://supabase.com/docs

Google OAuth Documentation: https://developers.google.com/identity/protocols/oauth2

## File Structure

The model training file is located in the root folder. The pre-trained gesture recognition model (sign_language_recognizer_25-04-2025.task) is located in the src/assests directory.

Model File: `src/assests/sign_language_recognizer_25-04-2025.task`

## User Journey

The platform provides a browser-based workflow for learning and practicing supported sign language gestures.

1. **Access the application:** Open the platform in a supported browser.
2. **Authenticate:** Use the configured email/password or Google sign-in option, where available.
3. **Explore learning modes:** Navigate to the available practice or test workflows.
4. **Practice gestures:** Follow the interface prompts and use webcam-based gesture recognition to receive feedback for supported signs.
5. **Complete assessments:** Use the test workflow to interact with the configured assessment activities.
6. **Review progress:** Visit the dashboard or profile to view the activity and progress information provided by the application.

Available screens, authentication options, and progress information depend on the application's current implementation and configuration.


## Future Improvements

Potential areas for future development include:

- **Recognition evaluation:** Evaluate the gesture-recognition model on a representative dataset and document reproducible performance metrics.
- **Expanded gesture support:** Explore adding more signs and gestures beyond the classes currently supported by the bundled model.
- **Recognition robustness:** Investigate how lighting, camera quality, and hand positioning affect recognition performance.
- **Accessibility:** Continue improving instructions, feedback, and navigation for users with different accessibility needs.
- **Automated testing:** Expand test coverage for camera errors, model initialization, and important user workflows.
- **User experience:** Explore improvements to learning progress summaries and practice feedback.

These are proposed improvements, not claims about features currently implemented in the application.
## Contributing

Contributions that improve the platform are welcome. Before proposing a change, review the existing implementation, test relevant functionality, and describe the purpose of your changes clearly.

## Code Quality and Maintenance

Keep changes focused and consistent with the existing project structure. Test affected functionality before submitting changes, and update the documentation when setup steps, features, or behavior change.

## Current Limitations

- **Supported gestures:** Recognition is limited to the classes supported by the bundled gesture-recognition model.
- **Recognition variability:** Results can vary with lighting, camera quality, hand positioning, and how clearly a gesture is performed.
- **Camera permissions:** Webcam-based features require browser camera access and an appropriate secure context.
- **Model evaluation:** The documented class count does not establish recognition accuracy. Reliable accuracy claims require evaluation against a representative, independently tested dataset.
- **Runtime requirements:** Gesture recognition depends on successful initialization of the configured MediaPipe runtime and bundled model.

## License

This project is provided as-is for educational and research purposes.

## Contact and Support

For project-related questions or technical issues, open an issue in the GitHub repository with a clear description of the problem and steps to reproduce it, where applicable.

## Acknowledgements

Special thanks to the open-source community for the tools and libraries that made this project possible.

- React: https://react.dev/
- MediaPipe: https://developers.google.com/mediapipe
- Supabase: https://supabase.com/
- Google OAuth: https://developers.google.com/identity/protocols/oauth2

## Development and Troubleshooting Guide

### Before Running the Application

- Install Node.js and npm.
- Clone the repository and run `npm install` from the project directory.
- Configure the Supabase and Google OAuth environment variables required by your application.
- Start the development server with `npm start`.
- Open the application in a supported browser and grant camera access when prompted.

### Camera Troubleshooting

If the webcam does not start:

1. Check that the browser has permission to access the camera.
2. Verify that the camera is connected and is not being exclusively used by another application.
3. Check the browser console for camera access errors.
4. Use `localhost` for local development or HTTPS for deployed environments where secure-context camera access is required.

### Gesture Model Troubleshooting

If gesture recognition does not initialize:

1. Verify that the bundled model exists at `src/assests/sign_language_recognizer_25-04-2025.task`.
2. Check `src/config/vision.js` for the configured MediaPipe runtime URL and recognizer options.
3. Inspect the browser console for model-loading or MediaPipe initialization errors.
4. Confirm that the model path and runtime configuration match the application's current implementation.

Recognition may vary with lighting, camera quality, hand positioning, and the gestures supported by the bundled model.

## MediaPipe Runtime Configuration

The application uses a pinned MediaPipe Tasks Vision runtime matching the
installed `@mediapipe/tasks-vision` dependency. The runtime and gesture-recognition
options are centralized in `src/config/vision.js`.

The runtime URL is centralized in:

`src/config/vision.js`

This avoids relying on a moving `@latest` CDN runtime.

The sign recognition model is loaded from:

`src/assests/sign_language_recognizer_25-04-2025.task`

## Troubleshooting

### Camera Access Issues

- Allow camera access when prompted by your browser.
- Check your browser's site permissions if camera access was previously denied.
- Close other applications that may be using the camera and try again.
- Use HTTPS in production or localhost during local development, as camera access generally requires a secure context.

### Gesture Recognition Model Fails to Load

- Check your internet connection because the MediaPipe WebAssembly runtime is loaded from a CDN.
- Confirm that the gesture-recognition model asset is present at the configured path.
- Reload the application and check the browser console for model-loading errors.
- If the problem persists, verify that the configured MediaPipe runtime URL and model asset are accessible.

### Recognition Performance Issues

- Ensure your hand is clearly visible within the camera frame.
- Try improving lighting and keeping your hand within the camera's field of view.
- Close unnecessary applications or browser tabs if recognition performance is poor.

## Testing and Quality Assurance

Automated tests help verify application behavior and reduce regressions during development.

### Run the Test Suite

Run the automated tests in non-interactive CI mode:

```bash
CI=true npm test -- --watchAll=false
```

The current test suite includes coverage for MediaPipe vision configuration, gesture recognizer initialization, camera error handling, and recognizer resource disposal.

### Check the Production Build

Create a production build with:

```bash
npm run build
```

Review build warnings and errors before deployment. A successful test run does not guarantee that every browser, camera, or gesture-recognition scenario works correctly.
