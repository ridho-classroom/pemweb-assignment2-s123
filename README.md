# Take Home Assignment #2

Make sure to read the entire assignment description before starting the implementation. Review the concepts of HTML5, CSS3, and JavaScript beforehand (using MDN as a reference is recommended). Since this submission requires Git, you should also familiarize yourself with how to use it effectively.

## Table of Content

- [Project Overview](#-project-overview)
- [Functional Requirements](#-functional-requirements)
- [Non Functional Requirements](#-non-functional-requirements)
- [Logistic Details](#logistic-details)

## 🎯 Project Overview

Create a responsive weather dashboard that demonstrates HTML5 semantics, CSS3 responsive design, and modern JavaScript with real-time API integration. This project uses the free OpenWeatherMap API to display current weather, forecasts, and location-based weather data.

## 📋 Functional Requirements

### Core Features (Must Have)

#### FR-1: Location-Based Weather Display

- Show current weather for user's location (geolocation)
- Display current temperature, weather condition, and icon
- Show additional details: humidity, wind speed, "feels like" temperature
- Display location name (city, country)

#### FR-2: Search Functionality

- Search weather by city name
- Show search suggestions/autocomplete
- Handle search errors gracefully
- Recent searches saved locally

#### FR-3: Weather Forecast

- Display 5-day weather forecast
- Show daily high/low temperatures
- Display weather icons and conditions
- Clickable forecast items for more details

#### FR-4: Data Persistence

- Save favorite locations using localStorage
- Remember user preferences (units, theme)
- Cache recent weather data for offline viewing
- Store search history

#### FR-5: User Interface Elements

- Toggle between Celsius and Fahrenheit
- Dark/light theme toggle
- Loading states for API calls
- Error messages for failed requests

### Enhanced Features (Nice to Have)

#### FR-6: Additional Weather Data

- Hourly forecast for current day
- Weather maps integration
- Air quality index
- UV index and sunrise/sunset times

#### FR-7: Advanced Interactions

- Weather alerts and notifications
- Comparison between multiple cities
- Weather trends and historical data
- Social sharing of weather conditions

## 🔧 Non-Functional Requirements

### Performance

- Initial load time < 2 seconds
- API response handling < 1 second
- Smooth animations at 60fps
- Mobile-optimized touch interactions

### Responsiveness

- Support 320px to 1920px viewport widths
- Mobile-first responsive design
- Touch-friendly interface (44px minimum touch targets)
- Orientation change support

### Accessibility

- WCAG 2.1 AA compliance
- Screen reader compatibility
- Keyboard navigation support
- High contrast mode support

### Browser Compatibility

- Chrome 90+, Firefox 85+, Safari 14+, Edge 90+
- Progressive enhancement for older browsers
- Graceful degradation without JavaScript

## Logistic Details

### Working Time Limit

24 September 2025, from 13.00 to 18.00 (maximum 5 hours)

### Way of Working

- Record your work session with screen sharing for a duration of 60–120 minutes.
- During the recording, it is recommended that you verbalize your thoughts and reasoning.
- You may refer to online resources, textbooks, or any tools you find useful, including AI-assisted tools. However, ensure that the final submission represents your own original work, and include this process in the recording.
- The recording is required to assess your workflow, problem-solving approach, reasoning, and decision-making, rather than solely the code you produce.

### Submission Method

- Create a fork of this repository in your own account and carry out the work in that fork.
- Submit your work by opening a Pull Request to this base project.
- Provide the assignment details, including the PR link and recording files, in the MS Teams assignment submission.
