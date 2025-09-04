/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Type } from '@google/genai';

// --- STATE SIMULATION ---
// In a real app, this would be part of a more robust state management solution.
const originalHomepageHTML = document.getElementById('main-content')?.innerHTML;


// --- QUIZ DATA ---
const quizData = [
  {
    section: 'Motivations & Pace',
    question: 'What are your primary reasons for traveling?',
    key: 'motivations',
    multiSelect: true,
    options: [
      { title: 'Relaxation', description: 'Unwind and recharge', icon: '🧘' },
      { title: 'Adventure', description: 'Seek thrills and excitement', icon: '🧗' },
      { title: 'Culture', description: 'Museums, history, art', icon: '🏛️' },
      { title: 'Foodie', description: 'Explore local cuisine', icon: '🍜' },
      { title: 'Social', description: 'Meet new people, nightlife', icon: '🎉' },
      { title: 'Nature', description: 'Hiking, scenery, wildlife', icon: '🌳' },
    ],
  },
  {
    section: 'Accommodation & Food',
    question: 'Where do you prefer to stay?',
    key: 'accommodation',
    multiSelect: true,
    options: [
      { title: 'Luxury Hotel', description: '5-star service, amenities', icon: '🏨' },
      { title: 'Boutique Hotel', description: 'Unique, stylish, personal', icon: '✨' },
      { title: 'Budget Hostel', description: 'Social, affordable, basic', icon: '🎒' },
      { title: 'Vacation Rental', description: 'Like a local, more space', icon: '🏡' },
      { title: 'Eco-Lodge', description: 'Sustainable, close to nature', icon: '🌿' },
      { title: 'Resort', description: 'All-inclusive, activities on-site', icon: '🏖️' },
    ],
  },
  {
    section: 'Companions & Comfort',
    question: 'Who do you usually travel with?',
    key: 'companions',
    multiSelect: false,
    options: [
      { title: 'Solo', description: 'Just me, myself, and I', icon: '🚶' },
      { title: 'Partner', description: 'A romantic getaway', icon: '❤️' },
      { title: 'Family', description: 'Creating memories together', icon: '👨‍👩‍👧‍👦' },
      { title: 'Friends', description: 'A fun group trip', icon: '🥳' },
    ],
  },
  {
    section: 'Planning & Vibe',
    question: 'What\'s your planning style?',
    key: 'planning',
    multiSelect: false,
    options: [
      { title: 'Meticulous Planner', description: 'Every detail scheduled', icon: '🗺️' },
      { title: 'Go-with-the-Flow', description: 'A rough idea is enough', icon: '🌬️' },
      { title: 'Balanced Approach', description: 'Key things booked, rest is open', icon: '⚖️' },
      { title: 'Totally Spontaneous', description: 'Book the flight, figure it out there', icon: '🚀' },
    ],
  },
  {
    section: 'Deal-Breakers',
    question: 'What\'s a trip deal-breaker for you?',
    key: 'dealBreakers',
    multiSelect: true,
    options: [
      { title: 'Lack of Cleanliness', description: 'Hygiene is a must', icon: '🧼' },
      { title: 'Feeling Unsafe', description: 'Security is paramount', icon: '🛡️' },
      { title: 'Bad Food Options', description: 'Good food is non-negotiable', icon: '🤢' },
      { title: 'No Wi-Fi', description: 'I need to stay connected', icon: '📶' },
      { title: 'Overcrowded Places', description: 'I prefer peace and quiet', icon: '👨‍👩‍👧‍👦' },
      { title: 'Inflexible Itinerary', description: 'I need freedom to explore', icon: '⛓️' },
    ],
  }
];

let currentQuizStep = 0;
let userAnswers = {};


// --- AUTHENTICATION SERVICE (PSEUDO-BACKEND) ---
const AuthService = {
  init: () => {
    if (!localStorage.getItem('travel_ai_users')) {
      const testUser = {
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'password123', 
        phone: '1234567890',
        quizProfile: null,
      };
      localStorage.setItem('travel_ai_users', JSON.stringify([testUser]));
    }
  },
  register: (fullName, email, password, phone) => {
    const users = JSON.parse(localStorage.getItem('travel_ai_users') || '[]');
    if (users.some(user => user.email === email)) {
      return { success: false, message: 'An account with this email already exists.' };
    }
    const newUser = { fullName, email, password, phone, quizProfile: null };
    users.push(newUser);
    localStorage.setItem('travel_ai_users', JSON.stringify(users));
    return { success: true, user: newUser };
  },
  login: (email, password) => {
    const users = JSON.parse(localStorage.getItem('travel_ai_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      sessionStorage.setItem('travel_ai_current_user', JSON.stringify(user));
      return { success: true, user };
    }
    return { success: false, message: 'Invalid email or password.' };
  },
  logout: () => {
    sessionStorage.removeItem('travel_ai_current_user');
  },
  getCurrentUser: () => {
    const userJson = sessionStorage.getItem('travel_ai_current_user');
    return userJson ? JSON.parse(userJson) : null;
  },
  isLoggedIn: () => {
    return !!AuthService.getCurrentUser();
  },
  saveUserProfile: (profile) => {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) return;

    const users = JSON.parse(localStorage.getItem('travel_ai_users') || '[]');
    const userIndex = users.findIndex(u => u.email === currentUser.email);
    
    if (userIndex > -1) {
      users[userIndex].quizProfile = profile;
      localStorage.setItem('travel_ai_users', JSON.stringify(users));
      // Also update the session storage to reflect the change immediately
      sessionStorage.setItem('travel_ai_current_user', JSON.stringify(users[userIndex]));
    }
  },
  isQuizCompleted: () => {
    const user = AuthService.getCurrentUser();
    return !!user?.quizProfile;
  }
};


// --- UI RENDERING FUNCTIONS ---
function renderHeader() {
  const authNav = document.getElementById('auth-nav');
  if (!authNav) return;

  if (AuthService.isLoggedIn()) {
    const user = AuthService.getCurrentUser();
    authNav.innerHTML = `
      <span class="user-welcome">Welcome, ${user.fullName.split(' ')[0]}!</span>
      <button id="logoutBtn" class="btn btn-logout">Logout</button>
    `;
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      AuthService.logout();
      renderHomepage();
      renderHeader();
    });
  } else {
    authNav.innerHTML = `
      <button id="loginBtn" class="btn btn-secondary">Login</button>
      <button id="signUpBtn" class="btn btn-primary">Sign Up</button>
    `;
    document.getElementById('loginBtn')?.addEventListener('click', () => renderAuthPage('login'));
    document.getElementById('signUpBtn')?.addEventListener('click', () => renderAuthPage('signup'));
  }
}

function renderHomepage() {
  const mainContent = document.getElementById('main-content');
  if (mainContent && originalHomepageHTML) {
    mainContent.innerHTML = originalHomepageHTML;
    mainContent.className = '';
    // Re-attach listener for the hero button if needed
    const discoverBtn = mainContent.querySelector('.hero-section .btn');
    discoverBtn?.addEventListener('click', () => {
        if(AuthService.isLoggedIn()){
            renderTripPlannerScreen();
        } else {
            renderAuthPage('signup');
        }
    });
  }
}

function renderTripPlannerScreen() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  // Enforce quiz completion
  if (!AuthService.isQuizCompleted()) {
    alert('Please complete the personality quiz first for a tailored experience!');
    currentQuizStep = 0;
    userAnswers = {};
    renderQuizStep(currentQuizStep);
    return;
  }

  mainContent.className = 'personalization-background'; // reuse background
  mainContent.innerHTML = `
    <div class="trip-planner-container">
      <h2>Plan Your Perfect Getaway</h2>
      <p>Fill in the details below, and let our AI craft your dream itinerary.</p>
      <form id="trip-details-form">
        
        <div class="form-grid">
          <div class="form-section">
            <label for="travel-dates">Start Date</label>
            <input type="date" id="travel-dates" required>
          </div>
           <div class="form-section">
            <label for="number-of-days">Number of Days</label>
            <input type="number" id="number-of-days" min="1" max="30" value="3" required>
          </div>
        </div>
        <div class="form-section">
            <label for="travelers">Number of Travelers</label>
            <input type="number" id="travelers" min="1" value="1" required>
        </div>

        <div class="form-section">
          <label for="budget">Budget (per person): <span id="budget-value">₹1,05,000</span></label>
          <div class="budget-slider-container">
            <span>₹10,000</span>
            <input type="range" id="budget" min="10000" max="200000" step="5000" value="105000">
            <span>₹2,00,000</span>
          </div>
        </div>
        
        <div class="form-section">
          <label>Destination Type</label>
          <div class="destination-cards-container">
            <div class="destination-card" data-value="Beach">
                <span class="card-text">Beach</span>
                <div class="checkmark">✔</div>
            </div>
            <div class="destination-card" data-value="Hills">
                <span class="card-text">Hills</span>
                <div class="checkmark">✔</div>
            </div>
            <div class="destination-card" data-value="City">
                <span class="card-text">City</span>
                <div class="checkmark">✔</div>
            </div>
            <div class="destination-card" data-value="International">
                <span class="card-text">International</span>
                <div class="checkmark">✔</div>
            </div>
          </div>
        </div>
        
        <div class="form-grid">
          <div class="form-section">
            <label for="trip-purpose">Trip Purpose</label>
            <select id="trip-purpose" required>
              <option value="leisure">Leisure & Relaxation</option>
              <option value="adventure">Adventure & Sports</option>
              <option value="honeymoon">Honeymoon</option>
              <option value="family">Family Vacation</option>
              <option value="business">Business Trip</option>
            </select>
          </div>
          <div class="form-section">
            <label for="trip-type">Trip Type</label>
            <select id="trip-type" required>
              <option value="domestic">Domestic</option>
              <option value="international">International</option>
              <option value="both">Both</option>
            </select>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-section">
            <label for="current-location">Your Current Location</label>
            <input type="text" id="current-location" placeholder="e.g., Mumbai, India">
          </div>
          <div class="form-section">
            <label for="travel-distance">How far are you willing to travel?</label>
            <select id="travel-distance" required>
              <option value="short">A short drive (under 4 hours)</option>
              <option value="medium">A short flight (2-5 hours)</option>
              <option value="long">A long haul flight (5+ hours)</option>
              <option value="any">Any distance!</option>
            </select>
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-large">Find My Destinations</button>
      </form>
    </div>
  `;

  // Add event listeners for interactive elements
  const budgetSlider = document.getElementById('budget') as HTMLInputElement;
  const budgetValue = document.getElementById('budget-value');
  if (budgetSlider && budgetValue) {
    budgetSlider.addEventListener('input', () => {
      const formattedValue = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(Number(budgetSlider.value));
      budgetValue.textContent = formattedValue;
    });
  }

  const destinationCards = document.querySelectorAll('.destination-card');
  destinationCards.forEach(card => {
    card.addEventListener('click', () => {
      const currentSelected = document.querySelector('.destination-card.selected');
      if (currentSelected) {
        currentSelected.classList.remove('selected');
      }
      card.classList.add('selected');
    });
  });

  const form = document.getElementById('trip-details-form') as HTMLFormElement;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    
    const tripData = {
      dates: (document.getElementById('travel-dates') as HTMLInputElement).value,
      numberOfDays: (document.getElementById('number-of-days') as HTMLInputElement).value,
      travelers: (document.getElementById('travelers') as HTMLInputElement).value,
      budget: (document.getElementById('budget') as HTMLInputElement).value,
      destinationType: document.querySelector('.destination-card.selected')?.getAttribute('data-value'),
      purpose: (document.getElementById('trip-purpose') as HTMLSelectElement).value,
      tripType: (document.getElementById('trip-type') as HTMLSelectElement).value,
      location: (document.getElementById('current-location') as HTMLInputElement).value,
      distance: (document.getElementById('travel-distance') as HTMLSelectElement).value,
    };

    if (!tripData.destinationType) {
        alert('Please select a destination type.');
        return;
    }

    renderAIDestinationSuggestions(tripData);
  });
}

/**
 * Generates a base64 image URL for a given destination.
 * @param {string} destinationName The name of the destination.
 * @param {string} destinationTitle The catchy title for the trip.
 * @returns {Promise<string>} A promise that resolves to a base64 image data URL.
 */
async function generateDestinationImage(destinationName, destinationTitle) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `A beautiful, photorealistic travel photograph of ${destinationName}, embodying the feeling of "${destinationTitle}". High-quality, vibrant colors, stunning landscape/cityscape.`;

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '4:3', // Good aspect ratio for a card
        },
    });

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
}

/**
 * Returns a placeholder image URL based on the destination type.
 * @param {string} destinationType The type of destination (e.g., 'Beach').
 * @returns {string} A URL to a placeholder image.
 */
function getDestinationImagePlaceholder(destinationType = '') {
    const type = destinationType.toLowerCase();
    if (type.includes('beach')) return 'https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg?auto=compress&cs=tinysrgb&w=600';
    if (type.includes('hills')) return 'https://images.pexels.com/photos/167699/pexels-photo-167699.jpeg?auto=compress&cs=tinysrgb&w=600';
    if (type.includes('city')) return 'https://images.pexels.com/photos/2246476/pexels-photo-2246476.jpeg?auto=compress&cs=tinysrgb&w=600';
    return 'https://images.pexels.com/photos/417054/pexels-photo-417054.jpeg?auto=compress&cs=tinysrgb&w=600'; // Default to international/general
}

async function renderAIDestinationSuggestions(tripData) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    mainContent.className = 'personalization-background';

    mainContent.innerHTML = `
        <div class="ai-loading-container">
            <div class="spinner"></div>
            <h2>Finding Your Perfect Destinations...</h2>
            <p>Our AI is searching for the best spots based on your preferences. Hang tight!</p>
        </div>
    `;

    try {
        const userProfile = AuthService.getCurrentUser()?.quizProfile;
        if (!userProfile) {
            throw new Error("User profile not found. Please complete the quiz.");
        }
        
        const prompt = `
          Act as an expert travel agent for Indian travelers. Based on the following user profile and trip details, suggest THREE distinct travel destinations.

          **User Personality Profile:**
          - Motivations: ${userProfile.motivations.join(', ')}
          - Preferred Accommodation: ${userProfile.accommodation.join(', ')}
          - Travel Companions: ${userProfile.companions.join(', ')}
          - Planning Style: ${userProfile.planning.join(', ')}
          - Deal Breakers: ${userProfile.dealBreakers.join(', ')}

          **Trip Details:**
          - Travel Start Date: ${tripData.dates}
          - Number of Days: ${tripData.numberOfDays}
          - Number of Travelers: ${tripData.travelers}
          - Budget (per person): Approx. INR ${new Intl.NumberFormat('en-IN').format(Number(tripData.budget))}
          - Desired Destination Type: ${tripData.destinationType}
          - Trip Purpose: ${tripData.purpose}
          - Trip Type: ${tripData.tripType}
          - Current Location: ${tripData.location || 'Not specified'}
          - Willing to Travel: ${tripData.distance}

          For each destination, provide a name, a catchy trip title (e.g., "Himalayan Adventure Trek" or "Goan Coastal Relaxation"), and a short paragraph (2-3 sentences) explaining why it's a perfect match for the user's preferences.
        `;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                suggestions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            destination: { type: Type.STRING },
                            title: { type: Type.STRING },
                            description: { type: Type.STRING },
                        },
                        required: ['destination', 'title', 'description'],
                    },
                },
            },
            required: ['suggestions'],
        };

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
            },
        });

        const suggestionsData = JSON.parse(response.text);

        // --- NEW: Generate images for each suggestion ---
        const loadingMessage = mainContent.querySelector('.ai-loading-container p');
        if (loadingMessage) {
            loadingMessage.textContent = 'Generating stunning visuals for your trip...';
        }

        const imagePromises = suggestionsData.suggestions.map(suggestion => {
            return generateDestinationImage(suggestion.destination, suggestion.title)
                .catch(err => {
                    console.error(`Failed to generate image for ${suggestion.destination}`, err);
                    return getDestinationImagePlaceholder(tripData.destinationType); // Fallback
                });
        });

        const imageUrls = await Promise.all(imagePromises);

        const suggestionsWithImages = suggestionsData.suggestions.map((suggestion, index) => ({
            ...suggestion,
            imageUrl: imageUrls[index]
        }));
        
        renderDestinationOptions(suggestionsWithImages, tripData);

    } catch (error) {
        console.error("Error generating destination suggestions:", error);
        mainContent.innerHTML = `
            <div class="quiz-results-container">
                <h2>Oops! Something Went Wrong</h2>
                <p>We couldn't generate your destinations. This could be due to a configuration issue or a temporary problem with the AI service.</p>
                <p>Please try planning your trip again.</p>
                <button id="try-again-btn" class="btn btn-primary">Try Again</button>
            </div>
        `;
        document.getElementById('try-again-btn')?.addEventListener('click', renderTripPlannerScreen);
    }
}

function renderDestinationOptions(suggestions, tripData) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    const optionsHTML = suggestions.map(option => `
        <div class="destination-option-card">
            <img src="${option.imageUrl}" alt="AI-generated image of ${option.destination}">
            <div class="destination-option-card-content">
                <h3>${option.title}</h3>
                <h4>📍 ${option.destination}</h4>
                <p>${option.description}</p>
                <button class="btn btn-primary generate-itinerary-btn" data-destination="${option.destination}">Generate Itinerary</button>
            </div>
        </div>
    `).join('');

    mainContent.className = 'personalization-background';
    mainContent.innerHTML = `
        <div class="destination-options-container">
            <h2>Here Are Your Top Matches!</h2>
            <p>Based on your profile, we think you'll love one of these places. Choose one to create a detailed plan.</p>
            <div class="options-grid-3-col">
                ${optionsHTML}
            </div>
            <button id="back-to-planner-btn" class="btn btn-secondary">Go Back & Change Details</button>
        </div>
    `;

    document.querySelectorAll('.generate-itinerary-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const chosenDestination = (event.target as HTMLElement).dataset.destination;
            if (chosenDestination) {
                generateDetailedItinerary(chosenDestination, tripData);
            }
        });
    });

    document.getElementById('back-to-planner-btn')?.addEventListener('click', renderTripPlannerScreen);
}

async function generateDetailedItinerary(chosenDestination, tripData) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.className = 'personalization-background';
    mainContent.innerHTML = `
        <div class="ai-loading-container">
            <div class="spinner"></div>
            <h2>Our AI is Crafting Your Journey to ${chosenDestination}...</h2>
            <p>Analyzing your preferences to build the perfect trip. This might take a moment!</p>
        </div>
    `;

    try {
        const userProfile = AuthService.getCurrentUser()?.quizProfile;
        if (!userProfile) {
            throw new Error("User profile not found. Please complete the quiz.");
        }
        
        const numberOfDays = parseInt(tripData.numberOfDays) || 3;
        const numberOfNights = Math.max(1, numberOfDays - 1);

        const prompt = `
            Act as an expert travel agent for Indian travelers. Based on the user profile and trip details below, create a complete, comprehensive travel plan for a trip to ${chosenDestination}.

            **User Personality Profile:**
            - Motivations: ${userProfile.motivations.join(', ')}
            - Preferred Accommodation: ${userProfile.accommodation.join(', ')}
            - Travel Companions: ${userProfile.companions.join(', ')}
            - Planning Style: ${userProfile.planning.join(', ')}
            - Deal Breakers: ${userProfile.dealBreakers.join(', ')}

            **Trip Details:**
            - Travel Start Date: ${tripData.dates}
            - Number of Days: ${numberOfDays}
            - Number of Travelers: ${tripData.travelers}
            - Budget (per person): Approx. INR ${new Intl.NumberFormat('en-IN').format(Number(tripData.budget))}
            - Desired Destination Type: ${tripData.destinationType}
            - Trip Purpose: ${tripData.purpose}
            - Trip Type: ${tripData.tripType}
            - Current Location: ${tripData.location || 'Not specified'}
            - Willing to Travel: ${tripData.distance}

            **Your response MUST include ALL of the following sections:**
            
            1.  **Hotel Suggestions:** Suggest THREE different hotels in ${chosenDestination} that fit the user's accommodation preferences and budget. For each hotel, provide its name, a hotel type (e.g., 'Boutique Hotel'), a price category (e.g., 'Budget'), a brief reason why it's a good fit, and a specific total price for a ${numberOfNights}-night stay in INR (e.g., "15000").

            2.  **Final Trip Quote:** Provide a final trip quote for one person for this ${numberOfDays}-day trip in Indian Rupees (INR). This quote should be based on a mid-range hotel choice. Include costs for Flights, Accommodation (for the total trip), Food, Activities, and Local Transport. Provide a final 'Total Trip Cost'.

            3.  **Detailed Itinerary:** Generate a ${numberOfDays}-day itinerary for the CHOSEN DESTINATION: ${chosenDestination}. The itinerary should be creative, practical, and tailored to the user's profile. For each day, provide a title, 3-4 distinct activities with suggested times, and recommendations for breakfast, lunch, and dinner, keeping Indian cuisine preferences in mind where applicable.
        `;
        
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                destination: { type: Type.STRING },
                tripTitle: { type: Type.STRING },
                hotelSuggestions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            hotelType: { type: Type.STRING, description: "e.g., Boutique Hotel, Luxury Resort" },
                            category: { type: Type.STRING, description: "e.g., Budget, Mid-Range, Luxury" },
                            reason: { type: Type.STRING },
                            price: { type: Type.STRING, description: "Total price for the stay in INR, e.g., '15000'" }
                        },
                        required: ['name', 'hotelType', 'category', 'reason', 'price']
                    }
                },
                tripQuote: {
                    type: Type.OBJECT,
                    properties: {
                        flights: { type: Type.STRING },
                        accommodation: { type: Type.STRING },
                        food: { type: Type.STRING },
                        activities: { type: Type.STRING },
                        localTransport: { type: Type.STRING },
                        totalCost: { type: Type.STRING }
                    },
                    required: ['flights', 'accommodation', 'food', 'activities', 'localTransport', 'totalCost']
                },
                itinerary: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            day: { type: Type.INTEGER },
                            title: { type: Type.STRING },
                            activities: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        time: { type: Type.STRING },
                                        description: { type: Type.STRING },
                                    },
                                    required: ['time', 'description'],
                                },
                            },
                            food: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        meal: { type: Type.STRING },
                                        recommendation: { type: Type.STRING },
                                    },
                                    required: ['meal', 'recommendation'],
                                },
                            },
                        },
                        required: ['day', 'title', 'activities', 'food'],
                    },
                },
            },
            required: ['destination', 'tripTitle', 'hotelSuggestions', 'tripQuote', 'itinerary'],
        };

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
            },
        });

        const itineraryData = JSON.parse(response.text);
        renderItineraryResult(itineraryData, tripData);

    } catch (error) {
        console.error("Error generating detailed itinerary:", error);
        mainContent.innerHTML = `
            <div class="quiz-results-container">
                <h2>Oops! Something Went Wrong</h2>
                <p>We couldn't generate your itinerary for ${chosenDestination}. This could be due to a configuration issue or a temporary problem with the AI service.</p>
                <p>Please try planning your trip again.</p>
                <button id="try-again-btn" class="btn btn-primary">Try Again</button>
            </div>
        `;
        document.getElementById('try-again-btn')?.addEventListener('click', renderTripPlannerScreen);
    }
}

/**
 * Returns a placeholder image URL based on the hotel type.
 * @param {string} hotelType The type of the hotel (e.g., 'Boutique Hotel').
 * @returns {string} A URL to a placeholder image.
 */
function getHotelImage(hotelType = '') {
    const type = hotelType.toLowerCase();
    if (type.includes('boutique')) return 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=600';
    if (type.includes('luxury') || type.includes('resort')) return 'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=600';
    if (type.includes('hostel')) return 'https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg?auto=compress&cs=tinysrgb&w=600';
    if (type.includes('eco-lodge') || type.includes('nature')) return 'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=600';
    return 'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=600'; // Default
}

function renderItineraryResult(data, tripData) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    const hotelsHTML = data.hotelSuggestions.map(hotel => `
        <div class="hotel-card">
            <img src="${getHotelImage(hotel.hotelType)}" alt="${hotel.name}">
            <div class="hotel-card-content">
                <div class="hotel-card-header">
                    <h5>${hotel.name}</h5>
                    <span class="hotel-category">${hotel.category}</span>
                </div>
                <p>${hotel.reason}</p>
                <button class="btn btn-secondary btn-small select-hotel-btn" data-price="${hotel.price.replace(/[^0-9]/g, '')}" data-name="${hotel.name}">Select</button>
            </div>
        </div>
    `).join('');

    const budgetHTML = `
        <div class="budget-items-grid">
            <div class="budget-item">
                <span>Flights</span>
                <strong>${data.tripQuote.flights}</strong>
            </div>
            <div class="budget-item">
                <span>Accommodation</span>
                <strong id="accommodation-cost">${data.tripQuote.accommodation}</strong>
            </div>
            <div class="budget-item">
                <span>Food</span>
                <strong>${data.tripQuote.food}</strong>
            </div>
            <div class="budget-item">
                <span>Activities</span>
                <strong>${data.tripQuote.activities}</strong>
            </div>
            <div class="budget-item">
                <span>Local Transport</span>
                <strong>${data.tripQuote.localTransport}</strong>
            </div>
        </div>
        <div class="total-budget">
            <span>Total Trip Cost</span>
            <span class="total-budget-amount" id="total-cost">${data.tripQuote.totalCost}</span>
        </div>
    `;

    const itineraryHTML = data.itinerary.map(day => `
        <div class="day-card">
            <h3>Day ${day.day}: ${day.title}</h3>
            <div class="day-content">
                <div class="day-section">
                    <h4>Activities</h4>
                    <ul class="activity-list">
                        ${day.activities.map(act => `<li><strong>${act.time}:</strong> ${act.description}</li>`).join('')}
                    </ul>
                </div>
                <div class="day-section">
                    <h4>Food</h4>
                     <ul class="food-list">
                        ${day.food.map(f => `<li><strong>${f.meal}:</strong> ${f.recommendation}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>
    `).join('');

    mainContent.className = 'personalization-background';
    mainContent.innerHTML = `
        <div class="itinerary-results-container">
            <h2>Your Complete Travel Plan!</h2>
            <p class="itinerary-subtitle">Here is your AI-crafted ${tripData.numberOfDays}-day trip to <strong>${data.destination}</strong>, titled "${data.tripTitle}".</p>
            
            <div class="hotel-suggestions-container">
                <h4>1. Select Your Hotel</h4>
                <p class="hotel-sub-text">Your choice will update the final price below.</p>
                <div class="hotel-grid">
                    ${hotelsHTML}
                </div>
            </div>
            
            <div class="budget-breakdown-container">
                <h4>2. Review Your Final Trip Quote (per person)</h4>
                ${budgetHTML}
            </div>

            <h4 class="itinerary-main-title">3. Day-by-Day Itinerary</h4>
            <div class="itinerary-days">
                ${itineraryHTML}
            </div>
            <div class="itinerary-actions">
                <button id="start-over-btn" class="btn btn-secondary">Plan Another Trip</button>
                <button id="proceed-to-payment-btn" class="btn btn-primary btn-large" disabled>Select a hotel to continue</button>
            </div>
        </div>
    `;

    // --- DYNAMIC PRICING LOGIC ---
    let selectedHotel = null;
    const paymentButton = document.getElementById('proceed-to-payment-btn') as HTMLButtonElement;
    
    const initialAccommodationCost = parseInt(data.tripQuote.accommodation.replace(/[^0-9]/g, ''));
    const flightsCost = parseInt(data.tripQuote.flights.replace(/[^0-9]/g, ''));
    const foodCost = parseInt(data.tripQuote.food.replace(/[^0-9]/g, ''));
    const activitiesCost = parseInt(data.tripQuote.activities.replace(/[^0-9]/g, ''));
    const transportCost = parseInt(data.tripQuote.localTransport.replace(/[^0-9]/g, ''));
    const otherCosts = flightsCost + foodCost + activitiesCost + transportCost;

    const accommodationCostEl = document.getElementById('accommodation-cost');
    const totalCostEl = document.getElementById('total-cost');
    
    document.querySelectorAll('.select-hotel-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const btn = event.currentTarget as HTMLButtonElement;
            const price = parseInt(btn.dataset.price || '0');
            const name = btn.dataset.name || 'Selected Hotel';

            selectedHotel = { name, price };
            
            // Update UI
            document.querySelectorAll('.hotel-card').forEach(card => card.classList.remove('selected'));
            btn.closest('.hotel-card')?.classList.add('selected');

            const newTotalCost = otherCosts + price;
            
            const formattedAccommodation = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(price);
            const formattedTotal = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(newTotalCost);
            
            if (accommodationCostEl) accommodationCostEl.textContent = formattedAccommodation;
            if (totalCostEl) totalCostEl.textContent = formattedTotal;
            
            paymentButton.disabled = false;
            paymentButton.textContent = `Proceed to Payment (${formattedTotal})`;
        });
    });


    document.getElementById('start-over-btn')?.addEventListener('click', renderTripPlannerScreen);
    paymentButton.addEventListener('click', () => {
        if (!selectedHotel) {
            alert('Please select a hotel to proceed.');
            return;
        }
        // Clone and update data to pass to payment page
        const finalItineraryData = JSON.parse(JSON.stringify(data));
        const newTotalCost = otherCosts + selectedHotel.price;
        
        finalItineraryData.tripQuote.accommodation = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(selectedHotel.price);
        finalItineraryData.tripQuote.totalCost = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(newTotalCost);
        
        renderPaymentPage(finalItineraryData, tripData);
    });
}

function renderPaymentPage(itineraryData, tripData) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.className = 'personalization-background';
    mainContent.innerHTML = `
        <div class="payment-container">
            <h2>Confirm and Pay</h2>
            <div class="booking-summary">
                <h4>Your Trip Summary</h4>
                <p class="summary-title">${itineraryData.tripTitle}</p>
                <div class="booking-summary-details">
                    <div><span>📍 Destination</span><strong>${itineraryData.destination}</strong></div>
                    <div><span>📅 Start Date</span><strong>${new Date(tripData.dates).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>
                    <div><span>⏳ Duration</span><strong>${tripData.numberOfDays} Days</strong></div>
                    <div><span>✈️ Travelers</span><strong>${tripData.travelers}</strong></div>
                </div>
                <div class="total-amount">
                    <span>Total Amount (per person)</span>
                    <h3>${itineraryData.tripQuote.totalCost}</h3>
                </div>
            </div>
            <form id="payment-form" novalidate>
                <h4>Enter Payment Details</h4>
                <div class="form-group">
                    <label for="card-name">Cardholder Name</label>
                    <input type="text" id="card-name" placeholder="John Doe" required>
                </div>
                <div class="form-group">
                    <label for="card-number">Card Number</label>
                    <input type="text" id="card-number" placeholder="0000 0000 0000 0000" maxlength="19" required>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="expiry-date">Expiry Date</label>
                        <input type="text" id="expiry-date" placeholder="MM/YY" required>
                    </div>
                    <div class="form-group">
                        <label for="cvv">CVV</label>
                        <input type="text" id="cvv" placeholder="123" maxlength="3" required>
                    </div>
                </div>
                <span class="error-message" id="paymentFormError" aria-live="polite"></span>
                <button type="submit" class="btn btn-primary btn-large btn-pay">Pay Securely</button>
                <div class="secure-info">
                    <span>🔒 Secure SSL Encryption</span>
                </div>
            </form>
        </div>
    `;

    const form = document.getElementById('payment-form');
    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        const paymentError = document.getElementById('paymentFormError') as HTMLSpanElement;

        // Simple validation check
        const cardName = (document.getElementById('card-name') as HTMLInputElement).value;
        const cardNumber = (document.getElementById('card-number') as HTMLInputElement).value;
        const expiryDate = (document.getElementById('expiry-date') as HTMLInputElement).value;
        const cvv = (document.getElementById('cvv') as HTMLInputElement).value;

        if (cardName && cardNumber && expiryDate && cvv) {
            paymentError.style.display = 'none';
            renderBookingConfirmation(itineraryData.destination);
        } else {
            paymentError.textContent = 'Please fill in all payment details.';
            paymentError.style.display = 'block';
        }
    });
}

function renderBookingConfirmation(destination) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    const bookingId = `TAI-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    mainContent.className = 'personalization-background';
    mainContent.innerHTML = `
        <div class="confirmation-container">
            <div class="confirmation-icon">✔</div>
            <h2>Booking Confirmed!</h2>
            <p>Your trip to <strong>${destination}</strong> is booked. Get ready for an adventure!</p>
            <div class="booking-details">
                <strong>Booking ID:</strong> ${bookingId}
                <p>A confirmation email with all your travel documents has been sent to your registered email address.</p>
            </div>
            <button id="plan-new-trip-btn" class="btn btn-primary">Plan Another Trip</button>
        </div>
    `;

    document.getElementById('plan-new-trip-btn')?.addEventListener('click', renderTripPlannerScreen);
}

function renderAuthPage(mode: 'login' | 'signup') {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    mainContent.className = ''; // Remove any special background classes
    
    const isLogin = mode === 'login';
    
    const title = isLogin ? 'Welcome Back!' : 'Create Your Account';
    const subtitle = isLogin ? 'Log in to continue your journey.' : 'Start your personalized journey today.';
    const buttonText = isLogin ? 'Log In' : 'Create Account';
    const toggleHTML = isLogin 
        ? `Don't have an account? <a href="#" id="auth-toggle">Sign Up</a>`
        : `Already have an account? <a href="#" id="auth-toggle">Log In</a>`;

    const formFields = `
        ${!isLogin ? `
        <div class="form-group">
          <label for="fullName">Full Name</label>
          <input type="text" id="fullName" placeholder="e.g., Priya Kumar" required />
        </div>` : ''}
        <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" placeholder="you@example.com" required />
        </div>
        ${!isLogin ? `
        <div class="form-group">
            <label for="phone">Phone Number</label>
            <input type="tel" id="phone" placeholder="e.g., 9876543210" required />
        </div>` : ''}
        <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" placeholder="••••••••" required />
        </div>
        ${!isLogin ? `
        <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input type="password" id="confirmPassword" placeholder="••••••••" required />
        </div>` : ''}
    `;

    mainContent.innerHTML = `
        <div class="auth-page-container">
            <div class="auth-visual-panel"></div>
            <div class="auth-form-panel">
                <div class="form-content-wrapper">
                    <h2>${title}</h2>
                    <p>${subtitle}</p>

                    <div class="social-login-container">
                        <button class="btn social-btn">
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google icon">
                            <span>Sign in with Google</span>
                        </button>
                        <button class="btn social-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M14.49,2.321a5.37,5.37,0,0,0-4.49,2.4,5.392,5.392,0,0,0-4.49-2.4C2.71,2.321,0,4.8,0,8.211a5.16,5.16,0,0,0,2.9,4.68,4.7,4.7,0,0,1,1.8-3.72,2.5,2.5,0,0,1,2.09-1,2.4,2.4,0,0,1,1.79.79,2.25,2.25,0,0,0,1.42.59,2.22,2.22,0,0,0,1.42-.59,2.381,2.381,0,0,1,1.79-.79,2.47,2.47,0,0,1,2.09,1,4.72,4.72,0,0,1,1.8,3.72A5.16,5.16,0,0,0,20,8.211C20,4.8,17.29,2.321,14.49,2.321Z" transform="translate(0 -0.01)"/><path d="M12.42,10.681a2.24,2.24,0,0,0-1.42-.59,2.22,2.22,0,0,0-1.42.59A3.811,3.811,0,0,0,8.1,12.721c-.8,1.6-1.6,3.3-2.7,3.3s-1.2-1-2.4-1c-1.3,0-2.3.9-2.3,2.5,0,1.9,1.6,2.8,3.3,2.8,1.6,0,2.4-1.2,4-1.2s2.5,1.2,4,1.2,3.3-1,3.3-2.8c0-1.5-1-2.5-2.3-2.5-1.2,0-1.9,1-2.4,1S13.22,12.281,12.42,10.681Z" transform="translate(0 -0.01)"/></svg>
                            <span>Sign in with Apple</span>
                        </button>
                    </div>

                    <div class="separator"><span>OR</span></div>
                    
                    <form id="auth-form" novalidate>
                        ${formFields}
                        <span class="error-message" id="formError" aria-live="polite"></span>
                        <button type="submit" class="btn btn-primary btn-large">${buttonText}</button>
                    </form>
                    <p class="auth-toggle-link">${toggleHTML}</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('auth-toggle')?.addEventListener('click', (e) => {
        e.preventDefault();
        renderAuthPage(isLogin ? 'signup' : 'login');
    });

    const form = document.getElementById('auth-form') as HTMLFormElement;
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const email = (document.getElementById('email') as HTMLInputElement).value;
        const password = (document.getElementById('password') as HTMLInputElement).value;
        const formError = document.getElementById('formError') as HTMLSpanElement;

        if (isLogin) {
            const result = AuthService.login(email, password);
            if (result.success) {
                renderHeader();
                renderTripPlannerScreen();
            } else {
                formError.textContent = result.message || 'Login failed.';
                formError.style.display = 'block';
            }
        } else {
            // Sign up logic
            const fullName = (document.getElementById('fullName') as HTMLInputElement).value;
            const phone = (document.getElementById('phone') as HTMLInputElement).value;
            const confirmPassword = (document.getElementById('confirmPassword') as HTMLInputElement).value;

            if (!fullName || !email || !phone || !password) {
                formError.textContent = 'Please fill out all fields.';
                formError.style.display = 'block';
                return;
            }
            if (password !== confirmPassword) {
                formError.textContent = 'Passwords do not match.';
                formError.style.display = 'block';
                return;
            }

            const registerResult = AuthService.register(fullName, email, password, phone);
            if(registerResult.success) {
                const loginResult = AuthService.login(email, password);
                if (loginResult.success) {
                    renderHeader();
                    // On first signup, go to quiz
                    currentQuizStep = 0;
                    userAnswers = {};
                    renderQuizStep(currentQuizStep);
                }
            } else {
                formError.textContent = registerResult.message || 'Registration failed.';
                formError.style.display = 'block';
            }
        }
    });
}

// --- QUIZ RENDERING LOGIC ---
function renderQuizStep(stepIndex) {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;
  mainContent.className = 'personalization-background';

  const stepData = quizData[stepIndex];
  const progress = ((stepIndex + 1) / quizData.length) * 100;

  const optionsHTML = stepData.options.map((opt, index) => {
      const isSelected = userAnswers[stepData.key]?.includes(opt.title);
      return `
      <div class="option-card ${isSelected ? 'selected' : ''}" data-key="${stepData.key}" data-value="${opt.title}" data-multiselect="${stepData.multiSelect}" role="button" tabindex="0">
        <span class="option-icon">${opt.icon}</span>
        <div class="option-text">
          <h4>${opt.title}</h4>
          <p>${opt.description}</p>
        </div>
        <div class="checkmark">✔</div>
      </div>
      `;
  }).join('');

  mainContent.innerHTML = `
    <div class="quiz-container">
      <div class="quiz-progress-container">
        <div class="quiz-progress-bar" style="width: ${progress}%;"></div>
      </div>
      <div class="quiz-header">
        <p>${stepData.section} (${stepIndex + 1} of ${quizData.length})</p>
        <h3>${stepData.question}</h3>
      </div>
      <div class="options-grid">
        ${optionsHTML}
      </div>
      <div class="quiz-nav">
        ${stepIndex > 0 ? '<button id="quiz-back-btn" class="btn btn-secondary">Back</button>' : ''}
        <button id="quiz-next-btn" class="btn btn-primary" ${!userAnswers[stepData.key]?.length ? 'disabled' : ''}>
          ${stepIndex === quizData.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  `;

  // Add event listeners
  document.querySelectorAll('.option-card').forEach(card => {
    card.addEventListener('click', handleOptionSelect);
  });
  document.getElementById('quiz-next-btn')?.addEventListener('click', handleQuizNext);
  document.getElementById('quiz-back-btn')?.addEventListener('click', handleQuizBack);
}

function handleOptionSelect(event) {
    const card = event.currentTarget as HTMLElement;
    const key = card.dataset.key;
    const value = card.dataset.value;
    const multiSelect = card.dataset.multiselect === 'true';

    if (!key || !value) return;

    if (!userAnswers[key]) {
        userAnswers[key] = [];
    }

    if (multiSelect) {
        if (userAnswers[key].includes(value)) {
            userAnswers[key] = userAnswers[key].filter(v => v !== value); // Deselect
            card.classList.remove('selected');
        } else {
            userAnswers[key].push(value); // Select
            card.classList.add('selected');
        }
    } else {
        // Single select
        document.querySelectorAll(`.option-card[data-key="${key}"]`).forEach(c => c.classList.remove('selected'));
        userAnswers[key] = [value];
        card.classList.add('selected');
    }

    // Enable/disable next button
    const nextBtn = document.getElementById('quiz-next-btn') as HTMLButtonElement;
    if (nextBtn) {
        nextBtn.disabled = !userAnswers[key]?.length;
    }
}

function handleQuizNext() {
  if (currentQuizStep < quizData.length - 1) {
    currentQuizStep++;
    renderQuizStep(currentQuizStep);
  } else {
    // Finish quiz
    AuthService.saveUserProfile(userAnswers);
    renderQuizResultScreen();
  }
}

function handleQuizBack() {
  if (currentQuizStep > 0) {
    currentQuizStep--;
    renderQuizStep(currentQuizStep);
  }
}

// --- QUIZ RESULT LOGIC ---
function getTravelerPersonality(answers) {
    const personalityMap = {
        'Relaxation': 'The Zen Seeker',
        'Adventure': 'The Thrill-Seeker',
        'Culture': 'The Cultured Explorer',
        'Foodie': 'The Gourmet Nomad',
        'Social': 'The Social Butterfly',
        'Nature': 'The Nature Enthusiast',
    };
    const mainMotivation = answers.motivations?.[0] || 'Adventurer';
    return personalityMap[mainMotivation] || 'The All-Rounder';
}

function renderQuizResultScreen() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    const personality = getTravelerPersonality(userAnswers);

    mainContent.className = 'personalization-background';
    mainContent.innerHTML = `
        <div class="quiz-results-container">
            <h2>Your Profile is Complete!</h2>
            <p>Based on your answers, we've identified your travel personality as:</p>
            <div class="personality-reveal">
                <h3>${personality}</h3>
            </div>
            <p>
                This means we can now find the perfect hidden gems, restaurants, and activities tailored just for you.
                Ready to see what we've found?
            </p>
            <button id="plan-from-results-btn" class="btn btn-primary btn-large">Continue to Trip Planning</button>
        </div>
    `;

    document.getElementById('plan-from-results-btn')?.addEventListener('click', renderTripPlannerScreen);
}


// --- MAIN APP INITIALIZATION ---
function main() {
  AuthService.init();
  renderHeader();
  // Attach listener for the initial hero button
  const discoverBtn = document.querySelector('.hero-section .btn');
  discoverBtn?.addEventListener('click', () => {
    if(AuthService.isLoggedIn()){
        renderTripPlannerScreen();
    } else {
        renderAuthPage('signup');
    }
  });
}

main();