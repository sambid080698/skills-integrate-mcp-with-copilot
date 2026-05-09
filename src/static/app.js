document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginForm = document.getElementById("login-form");
  const loginMessageDiv = document.getElementById("login-message");
  const logoutButton = document.getElementById("logout-button");
  const authStatus = document.getElementById("auth-status");
  const signupContainer = document.getElementById("signup-container");

  let isAuthenticated = false;

  function setAuthState(authenticated) {
    isAuthenticated = authenticated;
    signupContainer.classList.toggle("hidden", !authenticated);
    logoutButton.classList.toggle("hidden", !authenticated);
    loginForm.querySelector("button[type='submit']").textContent = authenticated ? "Logged In" : "Log In";
    authStatus.textContent = authenticated
      ? "Logged in. You can manage student registrations."
      : "Not logged in. Sign in to manage student registrations.";
  }

  async function updateAuthStatus() {
    try {
      const response = await fetch("/auth/status");
      const result = await response.json();
      setAuthState(result.authenticated);
    } catch (error) {
      console.error("Error checking auth status:", error);
      setAuthState(false);
    }
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML = details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map((email) => {
                    const deleteButton = isAuthenticated
                      ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                      : "";
                    return `<li><span class="participant-email">${email}</span>${deleteButton}</li>`;
                  })
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  async function loginUser(event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        loginMessageDiv.textContent = result.message;
        loginMessageDiv.className = "success";
        loginMessageDiv.classList.remove("hidden");
        setAuthState(true);
        fetchActivities();
      } else {
        loginMessageDiv.textContent = result.detail || "Login failed";
        loginMessageDiv.className = "error";
        loginMessageDiv.classList.remove("hidden");
      }
    } catch (error) {
      loginMessageDiv.textContent = "Login request failed. Please try again.";
      loginMessageDiv.className = "error";
      loginMessageDiv.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  }

  async function logoutUser() {
    try {
      const response = await fetch("/logout", { method: "POST" });
      const result = await response.json();

      if (response.ok) {
        loginMessageDiv.textContent = result.message;
        loginMessageDiv.className = "success";
        loginMessageDiv.classList.remove("hidden");
        setAuthState(false);
        fetchActivities();
      }
    } catch (error) {
      loginMessageDiv.textContent = "Logout failed. Please try again.";
      loginMessageDiv.className = "error";
      loginMessageDiv.classList.remove("hidden");
      console.error("Error logging out:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      messageDiv.textContent = "Please log in to sign up students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  loginForm.addEventListener("submit", loginUser);
  logoutButton.addEventListener("click", logoutUser);

  updateAuthStatus().then(fetchActivities);
});
