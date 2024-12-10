let currentQuestionId;
let pairId;
let totalVotesCount = 0; // Initialize total votes count
let pairVotesCount = 0; // Initialize pair votes count

async function fetchQuestion() {
  try {
    const res = await fetch('https://xrp-bridge.xyz/questions/random'); // Updated to your domain
    if (!res.ok) {
      throw new Error(`Error fetching question: ${res.status}`);
    }
    const question = await res.json();
    
    currentQuestionId = question.id; // Set the current question ID

    const questionContainer = document.getElementById('question'); // Get the question container
    questionContainer.classList.add('shake'); // Add shake class

    // Remove the shake class after animation ends
    questionContainer.addEventListener('animationend', () => {
      questionContainer.classList.remove('shake');
    });

    questionContainer.innerHTML = question.text;

    // Check if options exist
    if (question.options && question.options.length > 0) {
      // Shuffle the options array
      const shuffledOptions = question.options.sort(() => 0.5 - Math.random());

      // Select the first two options
      const selectedOptions = shuffledOptions.slice(0, 2);

      // Update option A
      const optionACard = document.getElementById('option-a');
      optionACard.querySelector('.option-image').src = selectedOptions[0].image; // Accessing the image path
      optionACard.querySelector('.option-text').textContent = selectedOptions[0].text;

      // Update option B
      const optionBCard = document.getElementById('option-b');
      optionBCard.querySelector('.option-image').src = selectedOptions[1].image; // Accessing the image path
      optionBCard.querySelector('.option-text').textContent = selectedOptions[1].text;

      // Send the pair to the server to add to the votes collection
      await addVotePair(selectedOptions[0].uniqueId, selectedOptions[1].uniqueId);
      pairId = [selectedOptions[0].uniqueId, selectedOptions[1].uniqueId].sort().join('-');

      // Fetch the current vote counts for the selected options
      const voteRes = await fetch(`https://xrp-bridge.xyz/votes/pair/${pairId}`); // New endpoint to get vote counts
      const voteData = await voteRes.json();

      // Update the votes for the pair
      document.getElementById('pair-votes-count').textContent = voteData[selectedOptions[0].uniqueId] + voteData[selectedOptions[1].uniqueId];
    } else {
      console.error("No options available for this question.");
    }

  } catch (error) {
    console.error(error);
    // Handle error (e.g., show a message to the user)
  }
}

// Function to add the vote pair to the database
async function addVotePair(optionA, optionB) {
  try {
    const res = await fetch('https://xrp-bridge.xyz/votes/pair', { // Updated to your domain
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ optionA, optionB })
    });

    if (!res.ok) {
      const message = await res.json();
      console.error(`Error adding vote pair: ${message.message}`);
    } else {
      console.log('Vote pair added successfully');
    }
  } catch (error) {
    console.error('Error sending vote pair:', error);
  }
}

async function fetchTotalVotes() {
  try {
    const res = await fetch('https://xrp-bridge.xyz/votes/total'); // Updated to your domain
    if (!res.ok) {
      throw new Error(`Error fetching total votes: ${res.status}`);
    }
    const data = await res.json();
    totalVotesCount = data.totalVotes; // Assuming the response has a totalVotes property
    document.getElementById('total-votes-count').textContent = totalVotesCount; // Update the display
  } catch (error) {
    console.error(error);
  }
}

// Call fetchTotalVotes when the page loads
document.addEventListener('DOMContentLoaded', function() {
  fetchTotalVotes(); // Fetch total votes on page load
});

async function vote(selectedOptionText) {
  // Disable both options immediately
  const optionACard = document.getElementById('option-a');
  const optionBCard = document.getElementById('option-b');
  
  // Remove click event listeners
  optionACard.onclick = null;
  optionBCard.onclick = null;
  
  // Add a 'voted' class to show it's disabled
  optionACard.classList.add('voted');
  optionBCard.classList.add('voted');

  // Get the text of both options
  const optionAText = optionACard.querySelector('.option-text').textContent;
  const optionBText = optionBCard.querySelector('.option-text').textContent;

  // Determine the other option
  const otherOption = selectedOptionText === optionAText ? optionBText : optionAText;

  // Fetch the unique IDs of the options from the questions collection
  const questionRes = await fetch(`https://xrp-bridge.xyz/question/${currentQuestionId}`); // Updated to your domain
  const question = await questionRes.json();

  // Debugging: Log the question object and option texts
  console.log('Fetched question:', question);
  console.log('Option A Text:', optionAText);
  console.log('Option B Text:', optionBText);
  console.log('Selected Option Text:', selectedOptionText);
  console.log('Other Option Text:', otherOption);

  // Find the unique IDs for the selected and other options
  const selectedOption = question.options.find(opt => opt.text === selectedOptionText);
  const otherOptionObj = question.options.find(opt => opt.text === otherOption);

  // Check if the selected option was found
  if (!selectedOption || !otherOptionObj) {
    console.error('Could not find unique IDs for the options:', {
      selectedOptionText,
      otherOption,
      options: question.options
    });
    return; // Exit if options are not found
  }

  const selectedOptionId = selectedOption.uniqueId;
  const otherOptionId = otherOptionObj.uniqueId;

  // Send the vote to the server
  const res = await fetch('https://xrp-bridge.xyz/vote', { // Updated to your domain
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pairId, option: selectedOptionId, otherOption: otherOptionId }) // Send pairId and unique IDs
  });
  
  if (!res.ok) {
    const errorMessage = await res.json();
    console.error(`Error voting: ${errorMessage.error}`);
    return; // Exit if there's an error
  }

  const results = await res.json();
  
  // Calculate percentages
  const totalVotes = results[selectedOptionId] + results[otherOptionId]; // Use the correct option IDs
  const percentageSelected = (results[selectedOptionId] / totalVotes) * 100; // Use the correct option IDs
  const percentageUnselected = (results[otherOptionId] / totalVotes) * 100; // Use the correct option IDs

  // Update the result percentages based on the selected option
  if (optionAText === selectedOptionText) {
    optionACard.querySelector('.result-percentage').textContent = `${percentageSelected.toFixed(2)}%`;
    optionBCard.querySelector('.result-percentage').textContent = `${percentageUnselected.toFixed(2)}%`;
  } else {
    optionACard.querySelector('.result-percentage').textContent = `${percentageUnselected.toFixed(2)}%`;
    optionBCard.querySelector('.result-percentage').textContent = `${percentageSelected.toFixed(2)}%`;
  }
  
  // Update the pair votes count
  pairVotesCount = results[selectedOptionId] + results[otherOptionId]; // Sum the votes for the pair
  document.getElementById('pair-votes-count').textContent = pairVotesCount; // Update the display

  // Add flip effect
  optionACard.classList.add('flipped');
  optionBCard.classList.add('flipped');
  
  // Add next question button after delay
  setTimeout(() => {
    const nextButton = document.createElement('button');
    nextButton.id = 'next-question';
    nextButton.textContent = 'Next Question';
    nextButton.onclick = nextQuestion;
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'next-button-container';
    buttonContainer.appendChild(nextButton);
    document.getElementById('question-container').appendChild(buttonContainer);
  }, 1000);
  
  fetchTotalVotes();
  document.getElementById('total-votes-count').textContent = totalVotesCount; // Update the display

  const votesText = document.getElementById('total-votes'); // Get the container
  votesText.classList.add('shake'); // Add shake class

  // Remove the shake class after animation ends
  votesText.addEventListener('animationend', () => {
    votesText.classList.remove('shake');
  });
}

function showResults() {
  document.getElementById('question-container').style.display = 'none';
  document.getElementById('results-container').style.display = 'block';
}

function nextQuestion() {
  currentQuestionId++;
  
  // Remove voted class and re-enable click events
  const optionACard = document.getElementById('option-a');
  const optionBCard = document.getElementById('option-b');
  
  // Remove flipped and voted classes from both cards
  optionACard.classList.remove('voted', 'flipped');
  optionBCard.classList.remove('voted', 'flipped');
  
   // Pass the actual text of the options to the vote function
   optionACard.onclick = () => vote(optionACard.querySelector('.option-text').textContent);
   optionBCard.onclick = () => vote(optionBCard.querySelector('.option-text').textContent);
   
  
  // Remove next button if it exists
  const buttonContainer = document.querySelector('.next-button-container');
  if (buttonContainer) {
    buttonContainer.remove();
  }
  
  fetchQuestion();
}

// Add initial click handlers when the page loads
document.addEventListener('DOMContentLoaded', function() {
  const optionACard = document.getElementById('option-a');
  const optionBCard = document.getElementById('option-b');
  
  // Pass the actual text of the options to the vote function
  optionACard.onclick = () => vote(optionACard.querySelector('.option-text').textContent);
  optionBCard.onclick = () => vote(optionBCard.querySelector('.option-text').textContent);
 
  fetchQuestion();
});

// Popup functionality
document.addEventListener('DOMContentLoaded', function() {
    const roadmapLink = document.getElementById('roadmap');
    const whitepaperLink = document.getElementById('whitepaper');
    const roadmapPopup = document.getElementById('roadmap-popup');
    const whitepaperPopup = document.getElementById('whitepaper-popup');
    const closeButtons = document.querySelectorAll('.close-btn');

    // Open roadmap popup
    roadmapLink.addEventListener('click', function(e) {
        e.preventDefault();
        roadmapPopup.style.display = 'flex';
    });

    // Open whitepaper popup
    whitepaperLink.addEventListener('click', function(e) {
        e.preventDefault();
        whitepaperPopup.style.display = 'flex';
    });

    // Close button functionality
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            roadmapPopup.style.display = 'none';
            whitepaperPopup.style.display = 'none';
        });
    });

    // Close popup when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('popup-overlay')) {
            e.target.style.display = 'none';
        }
    });
});

// Question mark animation
document.addEventListener("DOMContentLoaded", function() {
    // Calculate number of question marks based on window width
    const numMarks = Math.max(Math.min(window.innerWidth / 10, 200), 100);
    
    for (let i = 0; i < numMarks; i++) {
        let mark = document.createElement("div");
        mark.className = "question-mark";
        mark.textContent = "?";
        
        // Random positioning and styling
        mark.style.left = Math.random() * 100 + "vw";
        mark.style.fontSize = Math.random() * 20 + 15 + "px";
        mark.style.animationDuration = Math.random() * 3 + 3 + "s";
        mark.style.animationDelay = Math.random() * -10 + "s";

        // Set rotation variables
        mark.style.setProperty("--rotX", Math.random() < 0.5 ? -1 : 1);
        mark.style.setProperty("--rotY", Math.random() < 0.5 ? -1 : 1);
        mark.style.setProperty("--rotZ", Math.random() < 0.5 ? -0.5 : 0.5);
        mark.style.setProperty("--angle", `${Math.random() < 0.5 ? -720 : 720}deg`);
        mark.style.setProperty("--translateX", `${Math.random() * 200 - 100}px`);

        document.body.appendChild(mark);
    }
});

