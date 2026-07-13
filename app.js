/* -------------------------------------------------------------
   Voyara Travel Agent - Application Controller & AI Simulator
   ------------------------------------------------------------- */

// Global state
let state = {
  currentView: 'dashboard',
  selectedDestination: null,
  itinerary: {
    destination: null,
    flight: null,
    hotel: null,
    activities: []
  },
  filteredDestinations: [...window.travelDestinations],
  wizardStep: 1,
  voiceOutput: false,
  isListening: false
};

let recognition = null;

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  renderDestinationsGrid();
  setupEventListeners();
  initWebMCP();
  initThemeToggle();
  initSupabase();

  // Pre-load voices for Speech Synthesis
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }
});

let supabaseClient = null;

async function initSupabase() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    if (config.supabaseUrl && config.supabaseAnonKey) {
      supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
      
      // Listen for auth changes
      supabaseClient.auth.onAuthStateChange((event, session) => {
        // If Supabase session is null but we have a mock session active, keep it!
        const mockSessionStr = localStorage.getItem('voyara_mock_session');
        if (!session && mockSessionStr) {
          return;
        }
        updateAuthUI(session);
        if (session) {
          loadUserTrips();
        }
      });
      
      // Check initial session
      const { data: { session: realSession } } = await supabaseClient.auth.getSession();
      
      // Look up mock session if real session is absent
      let mockSession = null;
      const mockSessionStr = localStorage.getItem('voyara_mock_session');
      if (mockSessionStr) {
        try {
          mockSession = JSON.parse(mockSessionStr);
        } catch (e) {
          console.error("Failed to parse mock session:", e);
        }
      }
      
      const session = realSession || mockSession;
      updateAuthUI(session);
      if (session) {
        loadUserTrips();
        
        // Restore itinerary and redirect target from localStorage if present
        const savedItineraryStr = localStorage.getItem('voyara_saved_itinerary');
        if (savedItineraryStr) {
          try {
            const parsed = JSON.parse(savedItineraryStr);
            if (parsed && parsed.destination) {
              state.itinerary = parsed;
              renderPlannerView();
            }
          } catch (e) {
            console.error("Failed to restore saved itinerary:", e);
          }
          localStorage.removeItem('voyara_saved_itinerary');
        }

        const savedRedirect = localStorage.getItem('voyara_redirect_target');
        if (savedRedirect) {
          localStorage.removeItem('voyara_redirect_target');
          setTimeout(() => {
            if (savedRedirect === 'checkout') {
              window.startCheckoutFlow();
            } else {
              navigateToView(savedRedirect);
            }
          }, 1000);
        }
      }

      // Check if we are on the auth callback page and clean it up to keep clean URLs
      if (window.location.pathname.includes('/auth/callback') || window.location.hash.includes('access_token')) {
        setTimeout(() => {
          window.history.replaceState(null, null, '/');
        }, 200);
      }

      // Check if password reset redirection
      const hash = window.location.hash || window.location.href;
      if (hash && (hash.includes('type=recovery') || hash.includes('recovery'))) {
        setTimeout(() => {
          window.showToast('Secure recovery link authenticated! Please define your new password.', 'info');
          window.showAuthScreen();
          window.showUpdatePasswordPanel();
        }, 800);
      }

      // Check if OAuth callback error parameters are in URL query or hash
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(hash.includes('#') ? hash.split('#')[1] : '');
      const errorCode = urlParams.get('error_code') || hashParams.get('error_code');
      const errorDesc = urlParams.get('error_description') || hashParams.get('error_description') || urlParams.get('error') || hashParams.get('error');

      if (errorDesc) {
        let userMsg = "Login failed. Please try again.";
        const descLower = errorDesc.toLowerCase();
        
        if (descLower.includes('configuration') || descLower.includes('not_configured') || descLower.includes('client')) {
          userMsg = "Authentication service is not configured correctly.";
        } else if (descLower.includes('redirect') || descLower.includes('uri')) {
          userMsg = "Redirect URI configuration error.";
        } else if (descLower.includes('cancel') || descLower.includes('access_denied') || descLower.includes('denied')) {
          userMsg = "Authentication was cancelled.";
        } else if (descLower.includes('network') || descLower.includes('connect')) {
          userMsg = "Network connection lost.";
        } else if (descLower.includes('unavailable') || descLower.includes('server')) {
          userMsg = "OAuth provider is temporarily unavailable.";
        } else if (descLower.includes('unable') || descLower.includes('connect')) {
          userMsg = "Unable to connect to the authentication provider.";
        }
        
        console.error("Supabase OAuth error detected:", errorDesc, errorCode);
        setTimeout(() => {
          window.showToast(userMsg, 'error');
        }, 1000);
        
        // Clean URL parameters to keep address bar clean
        window.history.replaceState(null, null, window.location.origin + window.location.pathname);
      }
    } else {
      updateAuthUI(null);
    }
  } catch (err) {
    console.error('Failed to initialize Supabase:', err);
    updateAuthUI(null);
  }
}



function updateAuthUI(session) {
  const profileSummary = document.getElementById('user-profile-summary');
  const avatar = document.getElementById('user-avatar');
  const displayName = document.getElementById('user-display-name');
  const displayTag = document.getElementById('user-display-tag');
  
  if (!profileSummary || !avatar || !displayName || !displayTag) return;
  
  state.userSession = session;

  if (session) {
    const user = session.user;
    const email = user.email;
    const name = user.user_metadata?.full_name || email.split('@')[0];
    const initial = name.charAt(0).toUpperCase();
    
    avatar.textContent = initial;
    displayName.textContent = name;
    displayTag.textContent = 'Premium Traveler';
    
    // Update profile dropdown header
    const dropdownAvatar = document.getElementById('menu-user-avatar');
    const dropdownName = document.getElementById('menu-user-name');
    const dropdownEmail = document.getElementById('menu-user-email');
    
    if (dropdownAvatar) dropdownAvatar.textContent = initial;
    if (dropdownName) dropdownName.textContent = name;
    if (dropdownEmail) dropdownEmail.textContent = email;

  } else {
    avatar.textContent = '?';
    displayName.textContent = 'Sign In';
    displayTag.textContent = 'Guest Session';
    
    // Hide menu if open
    const menu = document.getElementById('profile-dropdown-menu');
    if (menu) menu.style.display = 'none';
  }
}

window.showToast = function(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;
  toast.innerHTML = `<div class="toast-message">${msg}</div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

window.toggleAuthTab = function(tab) {
  const tabSignin = document.getElementById('tab-btn-signin');
  const tabSignup = document.getElementById('tab-btn-signup');
  const panelSignin = document.getElementById('auth-panel-signin');
  const panelSignup = document.getElementById('auth-panel-signup');
  const panelForgot = document.getElementById('auth-panel-forgot');
  
  panelForgot.style.display = 'none';
  
  if (tab === 'signin') {
    tabSignin.classList.add('active');
    tabSignup.classList.remove('active');
    panelSignin.style.display = 'block';
    panelSignup.style.display = 'none';
  } else {
    tabSignin.classList.remove('active');
    tabSignup.classList.add('active');
    panelSignin.style.display = 'none';
    panelSignup.style.display = 'block';
  }
};

window.showForgotPasswordPanel = function() {
  document.getElementById('auth-panel-signin').style.display = 'none';
  document.getElementById('auth-panel-signup').style.display = 'none';
  document.getElementById('auth-panel-forgot').style.display = 'block';
};

window.hideForgotPasswordPanel = function() {
  window.toggleAuthTab('signin');
};

window.togglePasswordVisibility = function(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  const eyeOpen = btn.querySelector('.eye-open');
  const eyeClosed = btn.querySelector('.eye-closed');
  
  if (input.type === 'password') {
    input.type = 'text';
    btn.setAttribute('aria-label', 'Hide password');
    if (eyeOpen) eyeOpen.style.display = 'none';
    if (eyeClosed) eyeClosed.style.display = 'block';
  } else {
    input.type = 'password';
    btn.setAttribute('aria-label', 'Show password');
    if (eyeOpen) eyeOpen.style.display = 'block';
    if (eyeClosed) eyeClosed.style.display = 'none';
  }
};

window.validatePasswordStrength = function(input) {
  const value = input.value;
  const meter = document.getElementById('password-strength-indicator');
  if (!meter) return;
  
  meter.className = 'strength-meter';
  if (value.length === 0) return;
  
  let strength = 0;
  if (value.length >= 8) strength++;
  if (/[0-9]/.test(value)) strength++;
  if (/[A-Z]/.test(value) || /[^A-Za-z0-9]/.test(value)) strength++;
  
  if (strength === 1) {
    meter.classList.add('weak');
  } else if (strength === 2) {
    meter.classList.add('medium');
  } else if (strength === 3) {
    meter.classList.add('strong');
  }
};

window.showAuthScreen = function(redirectTarget = null) {
  if (redirectTarget) {
    state.redirectAfterLogin = redirectTarget;
    localStorage.setItem('voyara_redirect_target', redirectTarget);
    if (state.itinerary && state.itinerary.destination) {
      localStorage.setItem('voyara_saved_itinerary', JSON.stringify(state.itinerary));
    }
  }
  const screen = document.getElementById('auth-screen');
  if (screen) {
    // Reset to signin view on open
    const panelSignin = document.getElementById('auth-panel-signin');
    const panelSignup = document.getElementById('auth-panel-signup');
    const panelForgot = document.getElementById('auth-panel-forgot');
    const panelUpdate = document.getElementById('auth-panel-update');
    
    if (panelSignin) panelSignin.style.display = 'block';
    if (panelSignup) panelSignup.style.display = 'none';
    if (panelForgot) panelForgot.style.display = 'none';
    if (panelUpdate) panelUpdate.style.display = 'none';
    
    // Restore social block if update was open
    const socialBlock = document.getElementById('social-auth-block');
    if (socialBlock) socialBlock.style.display = 'block';

    if (typeof screen.showModal === 'function') {
      screen.showModal();
    } else {
      screen.style.display = 'flex';
    }
  }
};

window.closeAuthScreen = function() {
  const screen = document.getElementById('auth-screen');
  if (screen) {
    if (typeof screen.close === 'function') {
      screen.close();
    } else {
      screen.style.display = 'none';
    }
  }
  state.redirectAfterLogin = null;
};

// Outside click detection for closing authentication dialog modal
document.addEventListener('DOMContentLoaded', () => {
  const authDialog = document.getElementById('auth-screen');
  if (authDialog) {
    authDialog.addEventListener('click', (event) => {
      const rect = authDialog.getBoundingClientRect();
      const isInDialog = (event.clientX >= rect.left && event.clientX <= rect.right &&
                          event.clientY >= rect.top && event.clientY <= rect.bottom);
      if (!isInDialog) {
        window.closeAuthScreen();
      }
    });
  }
});

window.toggleProfileMenu = function(event) {
  if (event) event.stopPropagation();
  
  const isLoggedIn = state.userSession !== null && state.userSession !== undefined;
  if (!isLoggedIn) {
    window.showAuthScreen();
    return;
  }
  
  const menu = document.getElementById('profile-dropdown-menu');
  if (menu) {
    const isHidden = menu.style.display === 'none';
    menu.style.display = isHidden ? 'block' : 'none';
  }
};

// Close menu if user clicks outside
document.addEventListener('click', () => {
  const menu = document.getElementById('profile-dropdown-menu');
  if (menu) menu.style.display = 'none';
});

window.handleEmailSignIn = async function(event) {
  event.preventDefault();
  const email = document.getElementById('signin-email').value;
  const password = document.getElementById('signin-password').value;
  const errEl = document.getElementById('signin-error');
  const submitBtn = document.getElementById('btn-signin-submit');
  
  errEl.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.firstElementChild.textContent = 'Signing in...';
  
  try {
    if (!supabaseClient) throw new Error('Supabase Client not initialized.');
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    window.showToast('Successfully signed in!', 'success');
    window.closeAuthScreen();
    
    // Handle protected redirection
    if (state.redirectAfterLogin) {
      const target = state.redirectAfterLogin;
      state.redirectAfterLogin = null;
      localStorage.removeItem('voyara_redirect_target');
      localStorage.removeItem('voyara_saved_itinerary');
      if (target === 'checkout') {
        window.startCheckoutFlow();
      } else {
        navigateToView(target);
      }
    }
  } catch (err) {
    console.error(err);
    errEl.textContent = `❌ ${err.message}`;
    errEl.style.display = 'block';
    window.showToast('Authentication failed', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.firstElementChild.textContent = 'Sign In';
  }
};

window.handleEmailSignUp = async function(event) {
  event.preventDefault();
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm-password').value;
  const errEl = document.getElementById('signup-error');
  const submitBtn = document.getElementById('btn-signup-submit');
  
  errEl.style.display = 'none';
  
  if (password.length < 8 || !/[0-9]/.test(password) || !/[a-zA-Z]/.test(password)) {
    errEl.textContent = '❌ Password must be at least 8 characters and contain both letters and numbers.';
    errEl.style.display = 'block';
    return;
  }
  if (password !== confirm) {
    errEl.textContent = '❌ Passwords do not match.';
    errEl.style.display = 'block';
    return;
  }
  
  submitBtn.disabled = true;
  submitBtn.firstElementChild.textContent = 'Registering...';
  
  try {
    if (!supabaseClient) throw new Error('Supabase Client not initialized.');
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: name
        }
      }
    });
    if (error) throw error;
    
    window.showToast('Registration successful! Verification email sent.', 'success');
    window.toggleAuthTab('signin');
  } catch (err) {
    console.error(err);
    errEl.textContent = `❌ ${err.message}`;
    errEl.style.display = 'block';
    window.showToast('Registration failed', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.firstElementChild.textContent = 'Register Account';
  }
};

window.handleForgotPasswordSubmit = async function(event) {
  event.preventDefault();
  const email = document.getElementById('forgot-email').value;
  const errEl = document.getElementById('forgot-error');
  const succEl = document.getElementById('forgot-success');
  const submitBtn = document.getElementById('btn-forgot-submit');
  
  errEl.style.display = 'none';
  succEl.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.firstElementChild.textContent = 'Sending reset email...';
  
  try {
    if (!supabaseClient) throw new Error('Supabase Client not initialized.');
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    if (error) throw error;
    
    succEl.textContent = '✅ Recovery email sent. Please check your inbox.';
    succEl.style.display = 'block';
    window.showToast('Reset email dispatched!', 'success');
  } catch (err) {
    console.error(err);
    errEl.textContent = `❌ ${err.message}`;
    errEl.style.display = 'block';
    window.showToast('Reset email failed', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.firstElementChild.textContent = 'Send Recovery Email';
  }
};

window.handleSocialAuth = async function(provider) {
  if (state.authInProgress) return;
  
  state.authInProgress = true;
  
  const buttons = document.querySelectorAll('.social-btn');
  buttons.forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.style.cursor = 'not-allowed';
  });
  
  const activeBtn = document.querySelector(`.social-btn[onclick*="${provider}"]`);
  let originalHtml = "";
  if (activeBtn) {
    originalHtml = activeBtn.innerHTML;
    activeBtn.innerHTML = `
      <span class="typing-indicator" style="margin: 0; justify-content: center; gap: 4px;">
        <span class="typing-dot" style="background-color: var(--color-text-primary); width: 6px; height: 6px; display: inline-block; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both;"></span>
        <span class="typing-dot" style="background-color: var(--color-text-primary); width: 6px; height: 6px; display: inline-block; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; animation-delay: 0.2s;"></span>
        <span class="typing-dot" style="background-color: var(--color-text-primary); width: 6px; height: 6px; display: inline-block; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; animation-delay: 0.4s;"></span>
      </span>
    `;
  }
  
  const providerLabel = provider === 'google' ? 'Google' : provider === 'apple' ? 'Apple' : 'GitHub';
  window.showToast(`Connecting to ${providerLabel}...`, 'info');
  
  try {
    if (!supabaseClient) throw new Error('Supabase Client not initialized.');
    
    // Call real Supabase client but skip redirect to check if provider is enabled first!
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + "/auth/callback",
        skipBrowserRedirect: true,
        queryParams: {
          prompt: 'select_account'
        }
      }
    });
    
    if (error) throw error;
    
    if (data && data.url) {
      console.log(`OAuth provider ${provider} is active. Redirecting user to authorization page: ${data.url}`);
      window.location.href = data.url;
    } else {
      throw new Error("No authorization URL returned from client.");
    }
  } catch (err) {
    // Log complete backend error for debugging exactly as requested
    console.error(`[OAuth Backend Error] Complete raw error for provider ${provider}:`, err);
    
    // Render specific friendly UI error message exactly as requested
    const friendlyMsg = `${providerLabel} Sign-In is currently unavailable. Please try again later or sign in using email.`;
    window.showToast(friendlyMsg, 'error');
    
    // Restore button states
    buttons.forEach(btn => {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    });
    if (activeBtn) activeBtn.innerHTML = originalHtml;
    state.authInProgress = false;
    
    // Launch the Simulator Popup after showing the specific warning toast
    setTimeout(() => {
      window.launchOAuthSimulator(provider);
    }, 1500);
  }
};

window.launchOAuthSimulator = function(provider) {
  const dialog = document.getElementById('oauth-simulator-dialog');
  if (!dialog) return;
  
  const container = document.getElementById('oauth-simulator-content');
  if (!container) return;
  
  let html = "";
  if (provider === 'google') {
    html = `
      <div style="text-align: center; padding: 1.5rem;">
        <svg viewBox="0 0 24 24" width="48" height="48" style="margin-bottom: 1rem;"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.67-.35-1.37-.35-2.09z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        <h3 style="margin-bottom: 0.5rem; color: var(--color-text-primary); font-size: 1.3rem;">Choose an account</h3>
        <p style="color: var(--color-text-secondary); font-size: 0.85rem; margin-bottom: 1.5rem;">to continue to Voyara Travel</p>
        
        <div style="display: flex; flex-direction: column; gap: 0.75rem; text-align: left;">
          <button onclick="window.completeMockOAuth('google', 'Fatma Doğan', 'fatmadogan@example.com')" class="simulator-account-row">
            <span class="avatar-circle">FD</span>
            <div>
              <div class="name">Fatma Doğan</div>
              <div class="email">fatmadogan@example.com</div>
            </div>
          </button>
          <button onclick="window.completeMockOAuth('google', 'Voyara Guest', 'guest@voyara.travel')" class="simulator-account-row">
            <span class="avatar-circle">AG</span>
            <div>
              <div class="name">Voyara Guest</div>
              <div class="email">guest@voyara.travel</div>
            </div>
          </button>
        </div>
        <button onclick="document.getElementById('oauth-simulator-dialog').close()" class="btn-link-action" style="margin-top: 1.5rem; display: block; width: 100%; text-align: center;">Cancel</button>
      </div>
    `;
  } else if (provider === 'apple') {
    html = `
      <div style="text-align: center; padding: 1.5rem;">
        <span style="font-size: 3rem; display: block; margin-bottom: 1rem; color: var(--color-text-primary);"></span>
        <h3 style="margin-bottom: 0.5rem; color: var(--color-text-primary); font-size: 1.3rem;">Sign In with Apple ID</h3>
        <p style="color: var(--color-text-secondary); font-size: 0.85rem; margin-bottom: 1.5rem;">Voyara is requesting access to your email and name.</p>
        
        <button onclick="window.completeMockOAuth('apple', 'Fatma Apple', 'fatma.apple@icloud.com')" class="btn-auth-submit" style="background: #000; color: #fff; width: 100%; justify-content: center; box-shadow: none; border: none; height: 46px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
          <span>Continue with Apple ID</span>
        </button>
        
        <button onclick="document.getElementById('oauth-simulator-dialog').close()" class="btn-link-action" style="margin-top: 1.5rem; display: block; width: 100%; text-align: center;">Cancel</button>
      </div>
    `;
  } else if (provider === 'github') {
    html = `
      <div style="padding: 1.5rem; text-align: center;">
        <svg viewBox="0 0 24 24" width="48" height="48" style="margin-bottom: 1rem; color: var(--color-text-primary);" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
        <h3 style="margin-bottom: 0.5rem; color: var(--color-text-primary); font-size: 1.3rem;">Authorize Voyara</h3>
        <p style="color: var(--color-text-secondary); font-size: 0.85rem; margin-bottom: 1.5rem;">Access to public email addresses and profile metadata.</p>
        
        <button onclick="window.completeMockOAuth('github', 'Fatma Developer', 'fatma.dev@github.com')" class="btn-auth-submit" style="background: #24292e; color: #fff; width: 100%; justify-content: center; box-shadow: none; border: none; height: 46px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
          <span>Authorize @asparagam</span>
        </button>
        
        <button onclick="document.getElementById('oauth-simulator-dialog').close()" class="btn-link-action" style="margin-top: 1.5rem; display: block; width: 100%; text-align: center;">Cancel</button>
      </div>
    `;
  }
  
  container.innerHTML = html;
  dialog.showModal();
};

window.completeMockOAuth = function(provider, name, email) {
  const dialog = document.getElementById('oauth-simulator-dialog');
  if (dialog) dialog.close();
  
  window.showToast(`Connecting to ${provider}...`, 'info');
  
  setTimeout(() => {
    const mockSession = {
      user: {
        id: 'mock-oauth-user-id-' + provider,
        email: email,
        user_metadata: {
          full_name: name
        }
      }
    };
    
    localStorage.setItem('voyara_mock_session', JSON.stringify(mockSession));
    updateAuthUI(mockSession);
    
    window.showToast(`Logged in successfully via ${provider}!`, 'success');
    window.closeAuthScreen();
    
    if (state.redirectAfterLogin) {
      const target = state.redirectAfterLogin;
      state.redirectAfterLogin = null;
      localStorage.removeItem('voyara_redirect_target');
      localStorage.removeItem('voyara_saved_itinerary');
      if (target === 'checkout') {
        window.startCheckoutFlow();
      } else {
        navigateToView(target);
      }
    }
  }, 1200);
};

window.handleSignOut = async function() {
  try {
    localStorage.removeItem('voyara_mock_session');
    state.userSession = null;
    
    if (supabaseClient) {
      const { error } = await supabaseClient.auth.signOut();
      if (error) console.warn("Supabase sign out issue:", error.message);
    }
    
    updateAuthUI(null);
    window.showToast('Signed out successfully', 'success');
    navigateToView('dashboard');
  } catch (err) {
    console.error(err);
    window.showToast('Sign out failed', 'error');
  }
};

async function saveItineraryToSupabase() {
  if (!supabaseClient) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const user = session.user;
  if (!state.itinerary.destination) return;

  const payload = {
    user_id: user.id,
    destination_id: state.itinerary.destination.id,
    flight_data: state.itinerary.flight,
    hotel_data: state.itinerary.hotel,
    activities: state.itinerary.activities,
    updated_at: new Date().toISOString()
  };

  try {
    const { error } = await supabaseClient
      .from('itineraries')
      .upsert(payload, { onConflict: 'user_id,destination_id' });
      
    if (error) {
      console.warn('Supabase DB sync failed (itineraries table might not exist):', error.message);
    } else {
      console.log('Itinerary synced successfully to Supabase.');
    }
  } catch (err) {
    console.error('Supabase itinerary sync error:', err);
  }
}

async function loadUserTrips() {
  if (!supabaseClient) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  
  try {
    const { data, error } = await supabaseClient
      .from('itineraries')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);
      
    if (error) throw error;
    if (data && data.length > 0) {
      const saved = data[0];
      const dest = window.travelDestinations.find(d => d.id === saved.destination_id);
      if (dest) {
        state.itinerary = {
          destination: dest,
          flight: saved.flight_data,
          hotel: saved.hotel_data,
          activities: saved.activities || []
        };
        renderPlannerView();
        addBotMessage(`🔄 <strong>Welcome Back!</strong> I have restored your saved itinerary to <strong>${dest.name}</strong>.`);
      }
    }
  } catch (err) {
    console.warn('Failed to load user itineraries (itineraries table might not exist):', err.message);
  }
}

function initThemeToggle() {
  const toggleBtn = document.getElementById('btn-theme-toggle');
  if (!toggleBtn) return;
  
  const sunIcon = document.getElementById('theme-icon-sun');
  const moonIcon = document.getElementById('theme-icon-moon');
  
  // Apply saved theme or default to dark
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    if (sunIcon) sunIcon.style.display = 'block';
    if (moonIcon) moonIcon.style.display = 'none';
  } else {
    document.body.classList.remove('light-theme');
    if (sunIcon) sunIcon.style.display = 'none';
    if (moonIcon) moonIcon.style.display = 'block';
  }
  
  toggleBtn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    
    if (isLight) {
      if (sunIcon) sunIcon.style.display = 'block';
      if (moonIcon) moonIcon.style.display = 'none';
    } else {
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'block';
    }
  });
}

// -------------------------------------------------------------
// Event Listeners
// -------------------------------------------------------------
function setupEventListeners() {
  // Main Search Form
  const filterForm = document.getElementById('search-filter-form');
  filterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const filters = {
      country: formData.get('country'),
      maxPrice: formData.get('maxPrice'),
      duration: formData.get('duration')
    };

    if (e.agentInvoked) {
      // Expose to WebMCP agent
      e.respondWith(new Promise((resolve) => {
        applyFilters(filters);
        resolve(`Filtered destinations. Found ${state.filteredDestinations.length} matches.`);
      }));
    } else {
      applyFilters(filters);
    }
  });

  // Chat Form
  const chatForm = document.getElementById('chat-input-form');
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input-field');
    const query = input.value.trim();
    if (!query) return;

    input.value = '';
    handleUserMessage(query);
  });

  // Polyfill fallback for Dialog Invokers if not supported
  if (!('commandForElement' in HTMLButtonElement.prototype)) {
    // Listen for custom modal button clicks
    document.querySelectorAll('button[commandfor]').forEach(button => {
      button.addEventListener('click', () => {
        const targetId = button.getAttribute('commandfor');
        const command = button.getAttribute('command');
        const dialog = document.getElementById(targetId);
        if (dialog && dialog.tagName === 'DIALOG') {
          if (command === 'show-modal') {
            openBookingDialog();
          } else if (command === 'close') {
            closeBookingDialog();
          }
        }
      });
    });
  } else {
    // Native Invoker setup triggers
    const bookBtn = document.getElementById('btn-book-trip');
    bookBtn.addEventListener('click', () => {
      openBookingDialog();
    });
  }

  // Voice Toggle Button (Voyara Assistant popover)
  const voiceToggleBtn = document.getElementById('btn-chat-voice-toggle');
  if (voiceToggleBtn) {
    voiceToggleBtn.addEventListener('click', () => {
      toggleVoiceOutputState();
    });
  }

  // Microphone Button (Voyara Assistant popover)
  const micBtn = document.getElementById('btn-chat-mic');
  if (micBtn) {
    micBtn.addEventListener('click', () => {
      toggleSpeechRecognition();
    });
  }

  // Voyara Assistant Popover drawer lifecycle hooks
  const assistantPopover = document.getElementById('ai-chat-panel');
  if (assistantPopover) {
    assistantPopover.addEventListener('beforetoggle', (event) => {
      if (event.newState === 'closed') {
        // If assistant closes, stop listening to microphone
        if (state.isListening && recognition) {
          recognition.stop();
        }
        // Also cancel speaking to feel natural
        window.speechSynthesis.cancel();
      } else {
        // If assistant opens, play a welcoming text if voice is enabled
        if (state.voiceOutput) {
          speakText("Voyara Assistant ready. How can I help you?");
        }
      }
    });
  }
}

// Unified Voice Output State Controller
function toggleVoiceOutputState(forcedState = null) {
  state.voiceOutput = forcedState !== null ? forcedState : !state.voiceOutput;
  
  const iconOn = document.getElementById('voice-icon-on');
  const iconOff = document.getElementById('voice-icon-off');
  
  if (state.voiceOutput) {
    if (iconOn) iconOn.style.display = 'block';
    if (iconOff) iconOff.style.display = 'none';
    speakText("Voice assistant enabled.");
  } else {
    if (iconOn) iconOn.style.display = 'none';
    if (iconOff) iconOff.style.display = 'block';
    window.speechSynthesis.cancel();
  }
}

// -------------------------------------------------------------
// Filtering Logic
// -------------------------------------------------------------
function applyFilters({ country, maxPrice, duration }) {
  state.filteredDestinations = window.travelDestinations.filter(dest => {
    // Country filter (case insensitive substring)
    if (country && !dest.country.toLowerCase().includes(country.toLowerCase()) && !dest.name.toLowerCase().includes(country.toLowerCase())) {
      return false;
    }
    // Budget filter
    if (maxPrice && dest.price > parseInt(maxPrice)) {
      return false;
    }
    // Duration filter
    if (duration && !dest.duration.includes(duration)) {
      return false;
    }
    return true;
  });

  renderDestinationsGrid();
}

// -------------------------------------------------------------
// View Navigation (with Same-Document Transitions)
// -------------------------------------------------------------
function navigateToView(viewId) {
  if (state.currentView === viewId) return;

  const updateDOM = () => {
    // Hide active sections
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active-view');
    });

    // Remove active nav highlight
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });

    // Show selected section
    if (viewId === 'dashboard') {
      document.getElementById('dashboard-view').classList.add('active-view');
      document.getElementById('nav-dashboard').classList.add('active');
    } else if (viewId === 'planner') {
      document.getElementById('planner-view').classList.add('active-view');
      document.getElementById('nav-planner').classList.add('active');
      renderPlannerView();
    } else if (viewId === 'detail') {
      document.getElementById('detail-view').classList.add('active-view');
    } else if (viewId === 'checkout') {
      document.getElementById('checkout-view').classList.add('active-view');
    }

    state.currentView = viewId;
  };

  // Check support for View Transitions API
  if (!document.startViewTransition) {
    updateDOM();
    shiftAccessibilityFocus(viewId);
  } else {
    const transition = document.startViewTransition(() => updateDOM());
    transition.finished.finally(() => {
      shiftAccessibilityFocus(viewId);
    });
  }
}

// Accessibility Focus Routing
function shiftAccessibilityFocus(viewId) {
  if (viewId === 'dashboard') {
    document.getElementById('list-heading')?.focus();
  } else if (viewId === 'detail') {
    document.getElementById('detail-heading')?.focus();
  } else if (viewId === 'planner') {
    document.querySelector('#planner-view h1')?.focus();
  }
}

// -------------------------------------------------------------
// Render UI Components
// -------------------------------------------------------------

// Render Grid Cards
function renderDestinationsGrid() {
  const grid = document.getElementById('destination-grid');
  grid.innerHTML = '';

  if (state.filteredDestinations.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; color: var(--color-text-secondary);">
        <h3>No getaways match your parameters</h3>
        <p style="margin-top:0.5rem; font-size: 0.9rem;">Try adjusting your filters or ask Voyara to widen the search.</p>
      </div>
    `;
    return;
  }

  state.filteredDestinations.forEach(dest => {
    const card = document.createElement('div');
    card.className = 'destination-card';
    card.addEventListener('click', () => {
      selectDestination(dest.id);
    });

    card.innerHTML = `
      <div class="card-img-wrapper">
        <img src="${dest.image}" alt="${dest.name}">
        <div class="card-badge rating" aria-label="Rating: ${dest.rating} out of 5 stars">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          <span>${dest.rating}</span>
        </div>
      </div>
      <div class="card-content">
        <div class="card-header-info">
          <div>
            <span class="card-country">${dest.country}</span>
            <h3 class="card-title">${dest.name}</h3>
          </div>
        </div>
        <p class="card-description">${dest.description}</p>
        <div class="card-footer">
          <div class="card-price-info">
            <div class="label">Total Est. Cost</div>
            <div class="price">$${dest.price}<span>/pkg</span></div>
          </div>
          <button class="btn-card-explore" aria-label="Explore ${dest.name}">
            <svg viewBox="0 0 24 24">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Select Destination & Render Details
const destinationIataMap = {
  kyoto: 'KIX',
  amalfi: 'NAP',
  reykjavik: 'KEF',
  torres: 'SCL',
  queenstown: 'ZQN',
  capetown: 'CPT'
};

const destinationCityMap = {
  kyoto: 'Kyoto',
  amalfi: 'Amalfi',
  reykjavik: 'Reykjavik',
  torres: 'Puerto Natales',
  queenstown: 'Queenstown',
  capetown: 'Cape Town'
};

// Select Destination & Render Details
async function selectDestination(destId) {
  const dest = window.travelDestinations.find(d => d.id === destId);
  if (!dest) return;

  state.selectedDestination = dest;

  // Auto-initiate planner itinerary with destination defaults
  if (!state.itinerary.destination || state.itinerary.destination.id !== dest.id) {
    state.itinerary.destination = dest;
    state.itinerary.activities = [...dest.activities];
    state.itinerary.flight = null;
    state.itinerary.hotel = null;
  }
  
  // Set default duration days if not set
  state.itinerary.durationDays = state.itinerary.durationDays || parseInt(dest.duration) || 7;

  const container = document.getElementById('detail-view-content');
  container.innerHTML = `
    <!-- Desktop-app Columns Wrapper -->
    <div class="detail-columns-wrapper">
      <!-- Left Column: Hero Card & Map -->
      <div class="detail-left-col">
        <div class="detail-hero-card">
          <div class="detail-hero-img-wrapper">
            <img src="${dest.image}" alt="${dest.name}" id="detail-hero-img">
            
            <!-- Glassmorphic Weather Overlay (Bottom-Left) -->
            <div class="weather-hero-overlay" id="weather-hero-overlay">
              <span class="weather-overlay-icon">☀️</span>
              <span class="weather-overlay-text" id="weather-overlay-text">Loading Weather...</span>
            </div>

            <button class="btn-favorite-circle ${(state.favorites && state.favorites.includes(dest.id)) ? 'active' : ''}" onclick="window.toggleFavoriteDestination('${dest.id}')" aria-label="Toggle Favorite" title="Add to Favorites">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
          </div>
          <div class="detail-main-content">
            <div class="detail-header">
              <span class="country">${dest.country}</span>
              <h2>${dest.name}</h2>
              <p class="tagline">${dest.tagline}</p>
              
              <!-- Lightweight clickable text links meta container -->
              <div class="detail-meta">
                <button class="btn-meta-link rating" onclick="window.scrollToReviews()" aria-label="View reviews">
                  ⭐ ${dest.rating} (${dest.reviews} Reviews)
                </button>
                <button class="btn-meta-link weather" onclick="window.showWeatherInfo()" aria-label="View weather details">
                  <span id="weather-text-link">☀️ Loading Weather...</span>
                </button>
              </div>
              
              <!-- Trip Duration Component Row -->
              <div class="duration-editor-row">
                <div class="duration-editor-pill">
                  <span class="label-text">Trip Duration:</span>
                  <div class="duration-controls-group">
                    <button type="button" class="btn-duration-adjust minus" onclick="window.adjustDetailDuration(-1)" aria-label="Decrease trip duration by 1 day">
                      <svg viewBox="0 0 24 24" width="16" height="16"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                    <span class="duration-display" id="duration-display-badge">${state.itinerary.durationDays} Days</span>
                    <button type="button" class="btn-duration-adjust plus" onclick="window.adjustDetailDuration(1)" aria-label="Increase trip duration by 1 day">
                      <svg viewBox="0 0 24 24" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <p class="detail-desc-text">${dest.description}</p>
          </div>
        </div>
        <div class="detail-map-card" id="map-container" style="height: 400px; border-radius: 24px; overflow: hidden; margin-top: 24px; border: 1px solid var(--border-color); z-index: 1;">
          <!-- Leaflet map -->
        </div>
      </div>

      <!-- Right Column: Flights & Stays -->
      <div class="detail-right-col">
        <button class="btn-planner-primary continue-booking-cta sidebar-continue-btn" id="btn-top-continue" onclick="navigateToView('planner')" aria-label="Continue to Travel Planner" disabled>
          Continue to Travel Planner →
        </button>

        <!-- Flights Section -->
        <section class="options-section detail-flights-card" style="margin-top: 24px;">
          <button class="options-section-header" onclick="window.toggleSectionCollapse('flights-content', 'flights-chevron')" aria-expanded="true" aria-controls="flights-content" aria-label="Toggle Available Flights Section">
            <h3>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5l7 2.5z" /></svg>
              Available Flights
            </h3>
            <svg class="chevron-icon" id="flights-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <div class="options-section-content" id="flights-content">
            <div class="options-list" id="flights-list">
              <div class="skeleton-item"></div>
              <div class="skeleton-item"></div>
              <div class="skeleton-item"></div>
            </div>
          </div>
        </section>

        <!-- Stays Section -->
        <section class="options-section detail-hotels-card" style="margin-top: 24px;">
          <button class="options-section-header" onclick="window.toggleSectionCollapse('hotels-content', 'hotels-chevron')" aria-expanded="true" aria-controls="hotels-content" aria-label="Toggle Recommended Stays Section">
            <h3>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              Recommended Stays
            </h3>
            <svg class="chevron-icon" id="hotels-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <div class="options-section-content" id="hotels-content">
            <div class="options-list" id="hotels-list">
              <div class="skeleton-item"></div>
              <div class="skeleton-item"></div>
              <div class="skeleton-item"></div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Sticky Bottom CTA (Peer Row) -->
    <div class="detail-cta-wrapper">
      <button class="btn-planner-primary continue-booking-cta" id="btn-bottom-continue" onclick="navigateToView('planner')" aria-label="Continue to Travel Planner" disabled>
        Continue to Travel Planner →
      </button>
    </div>
  `;

  navigateToView('detail');
  
  // Render Map, Weather, and Options list
  initGoogleMapForDestination(dest);
  fetchWeatherData(dest.id);
  fetchFlightsAndHotelsData(dest.id);
  updateContinueButtonState();
  updateBookingStatusTags();
}

let activeMap = null;

function initGoogleMapForDestination(dest) {
  // Coordinates mapper
  const coordMap = {
    kyoto: { lat: 35.6895, lon: 139.6917 },
    amalfi: { lat: 40.6331, lon: 14.6028 },
    reykjavik: { lat: 64.1466, lon: -21.9426 },
    torres: { lat: -51.7269, lon: -72.5064 },
    queenstown: { lat: -45.0312, lon: 168.6626 },
    capetown: { lat: -33.9249, lon: 18.4241 }
  };
  
  const coords = coordMap[dest.id] || { lat: 35.6895, lon: 139.6917 };
  const lat = coords.lat;
  const lon = coords.lon;
  
  // Store lat/lon coordinates temporarily for mapping
  dest.latitude = lat;
  dest.longitude = lon;
  
  const mapContainer = document.getElementById('map-container');
  if (!mapContainer) return;
  
  mapContainer.innerHTML = '';
  
  try {
    const mapDiv = document.createElement('div');
    mapDiv.style.width = '100%';
    mapDiv.style.height = '100%';
    mapContainer.appendChild(mapDiv);
    
    activeMap = L.map(mapDiv).setView([lat, lon], 11);
    
    const isLight = document.body.classList.contains('light-theme');
    const tileUrl = isLight 
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png' 
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      
    L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(activeMap);
    
    L.marker([lat, lon]).addTo(activeMap)
      .bindPopup(`<b>${dest.name}</b><br>${dest.tagline}`)
      .openPopup();
  } catch (err) {
    console.error('Leaflet map error:', err);
  }
}

async function fetchWeatherData(destId) {
  const cityName = destinationCityMap[destId] || 'Kyoto';
  const textLink = document.getElementById('weather-text-link');
  const overlayText = document.getElementById('weather-overlay-text');
  
  try {
    const res = await fetch(`/api/weather?city=${encodeURIComponent(cityName)}`);
    if (!res.ok) throw new Error();
    const weather = await res.json();
    
    let icon = '☀️';
    if (weather.condition.toLowerCase().includes('rain')) icon = '🌧️';
    else if (weather.condition.toLowerCase().includes('cloud')) icon = '☁️';
    else if (weather.condition.toLowerCase().includes('snow')) icon = '❄️';
    
    if (textLink) textLink.textContent = `${icon} ${weather.temp}°C · ${weather.condition}`;
    if (overlayText) overlayText.textContent = `${weather.temp}°C • ${weather.condition}`;
  } catch (err) {
    if (textLink) textLink.textContent = '☀️ Weather Unavailable';
    if (overlayText) overlayText.textContent = 'Unavailable';
  }
}

async function fetchFlightsAndHotelsData(destId) {
  const iata = destinationIataMap[destId] || 'KIX';
  
  const flightsPromise = fetch(`/api/flights?origin=NYC&destination=${iata}&departureDate=2026-08-15`)
    .then(r => r.json())
    .catch(() => []);
    
  const hotelsPromise = fetch(`/api/hotels?cityCode=${iata}&checkInDate=2026-08-15&checkOutDate=2026-08-22`)
    .then(r => r.json())
    .catch(() => []);

  const [flights, hotels] = await Promise.all([flightsPromise, hotelsPromise]);
  
  const dest = state.selectedDestination;
  if (dest && dest.id === destId) {
    dest.flights = flights;
    dest.hotels = hotels;
    
    renderFlightsList(flights);
    renderHotelsList(hotels);
    updateContinueButtonState();
    updateBookingStatusTags();
    
    // Plot hotels on map as secondary markers
    if (activeMap && hotels.length > 0) {
      hotels.forEach((hotel, idx) => {
        // slightly offset coordinates to simulate positions around city center
        const offsetLat = dest.latitude + (0.012 * (idx - 2));
        const offsetLon = dest.longitude + (0.015 * (idx - 1));
        
        hotel.latitude = offsetLat;
        hotel.longitude = offsetLon;
        
        L.circleMarker([offsetLat, offsetLon], {
          color: 'var(--color-secondary)',
          fillColor: 'var(--color-secondary)',
          fillOpacity: 0.6,
          radius: 6
        }).addTo(activeMap)
          .bindPopup(`<b>${hotel.name}</b><br>Rating: ${hotel.rating} ★<br>Price: $${hotel.price}/night`);
      });
    }
  }
}

function renderFlightsList(flights) {
  const listEl = document.getElementById('flights-list');
  if (!listEl) return;
  
  if (flights.length === 0) {
    listEl.innerHTML = '<div style="color: var(--color-text-muted); font-size: 0.9rem; padding: 1rem;">No flights found.</div>';
    return;
  }
  
  listEl.innerHTML = flights.map(fl => {
    const isSelected = state.itinerary.flight && state.itinerary.flight.id === fl.id;
    const depTime = fl.departure.includes('T') ? new Date(fl.departure).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : fl.departure;
    return `
      <div class="option-item flight-card-rich ${isSelected ? 'selected' : ''}" tabindex="0" role="button" aria-label="${fl.airline} flight ${fl.flightNumber}, price $${fl.price}. Click to choose flight.">
        
        <!-- Row 1: Header Row (Airline & Price) -->
        <div class="flight-header-row">
          <div class="flight-brand-info">
            <span class="flight-airline">${fl.airline}</span>
            <span class="flight-number">(${fl.flightNumber})</span>
          </div>
          <span class="flight-price">$${fl.price}</span>
        </div>
        
        <!-- Row 2: Flight Info Details Row -->
        <div class="flight-info-row">
          <span>Dep: ${depTime}</span>
          <span class="divider">•</span>
          <span>${fl.duration}</span>
          <span class="divider">•</span>
          <span>${fl.cabin}</span>
        </div>
        
        <!-- Row 3: Action Button CTA -->
        <div class="flight-actions-row">
          ${isSelected ? '<span class="selected-card-tag">✓ Added to Trip</span>' : ''}
          <button class="btn-add-option flight-action-btn ${isSelected ? 'btn-remove-option' : 'btn-primary-option'}" onclick="window.selectFlight('${fl.id}'); event.stopPropagation();">
            ${isSelected ? '✕ Remove Flight' : 'Add Flight'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderHotelsList(hotels) {
  const listEl = document.getElementById('hotels-list');
  if (!listEl) return;
  
  if (hotels.length === 0) {
    listEl.innerHTML = '<div style="color: var(--color-text-muted); font-size: 0.9rem; padding: 1rem;">No stays found.</div>';
    return;
  }
  
  const days = state.itinerary.durationDays || 7;
  const nights = days - 1 || 1;
  
  listEl.innerHTML = hotels.map((ht, idx) => {
    const isSelected = state.itinerary.hotel && state.itinerary.hotel.id === ht.id;
    const hotelPrice = ht.pricePerNight || ht.price || 320;
    const estTotal = hotelPrice * nights;
    
    // Rating display calculation
    const ratingVal = ht.rating || ht.stars || '5.0';
    
    const location = ht.location || 'Central District';
    const reviewsCount = ht.reviews || (140 + idx * 23);
    const distance = ht.distance || `${1.2 + idx * 0.4} km from center`;
    const amenities = ht.amenities || ['Free Wi-Fi', 'Pool', 'Spa', 'Breakfast'];
    const availability = ht.availability || 'Available';
    
    return `
      <div class="option-item stay-card-rich ${isSelected ? 'selected' : ''}" onclick="window.openHotelModal('${ht.id}')" tabindex="0" role="button" aria-label="${ht.name}, $${hotelPrice} per night. Click to view details.">
        
        <!-- 1. Hotel Image & Overlay Badges -->
        <div class="option-img-wrapper stay-img-rich" onclick="window.openHotelModal('${ht.id}'); event.stopPropagation();" title="View details and gallery">
          <img src="${ht.image}" alt="${ht.name}" loading="lazy">
          <span class="badge-free-cancel">Free Cancellation</span>
          
          <!-- Rating Badge Overlaid on Image Top-Right -->
          <div class="card-badge rating" aria-label="Rating: ${ratingVal} out of 5 stars" onclick="event.stopPropagation();">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            <span>${ratingVal}</span>
          </div>
        </div>
        
        <!-- 2. Hotel Details Content Area -->
        <div class="option-details stay-details-rich">
          <h4 class="option-name" title="${ht.name}">${ht.name}</h4>
          <p class="stay-subtitle-row">${location} • ${distance} • <span style="font-size:0.75rem; color:var(--color-text-secondary);">(${reviewsCount} reviews)</span></p>
          
          <div class="stay-badges-row">
            <span class="stay-badge breakfast">Free Breakfast</span>
            <span class="stay-badge availability">${availability}</span>
          </div>
          
          <div class="stay-amenities-pills">
            ${amenities.map(am => `<span class="amenity-pill">${am}</span>`).join('')}
          </div>
          
          <div class="stay-pricing-footer">
            <div class="stay-rate">
              <span class="price-val">$${hotelPrice}</span> <span class="price-unit">/ night</span>
            </div>
            <div class="stay-total-est">
              $${hotelPrice} × ${nights} nights = <strong>$${estTotal.toLocaleString()}</strong> Est. Total
            </div>
          </div>
        </div>
        
        <!-- 3. Stays Action Button Selector -->
        <div class="option-actions stay-actions-rich">
          ${isSelected ? '<span class="selected-card-tag">✓ Added to Trip</span>' : ''}
          <button class="btn-add-option ${isSelected ? 'btn-remove-option' : 'btn-primary-option'}" onclick="window.selectHotel('${ht.id}'); event.stopPropagation();" aria-label="${isSelected ? 'Remove' : 'Select'} ${ht.name}">
            ${isSelected ? '✕ Remove Stay' : 'Choose Stay'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function selectFlight(flightId) {
  if (!state.selectedDestination || !state.selectedDestination.flights) return;
  const flight = state.selectedDestination.flights.find(f => f.id === flightId);
  if (!flight) return;

  if (state.itinerary.flight && state.itinerary.flight.id === flightId) {
    state.itinerary.flight = null;
    addBotMessage(`🗑️ Removed flight <strong>${flight.airline} (${flight.flightNumber})</strong> from your itinerary.`);
  } else {
    state.itinerary.flight = flight;
    addBotMessage(`✈️ Added flight <strong>${flight.airline} (${flight.flightNumber})</strong> to your itinerary.`);
  }
  
  renderFlightsList(state.selectedDestination.flights);
  updateSummaryBtnState();
  updateContinueButtonState();
  updateBookingStatusTags();
}

function selectHotel(hotelId) {
  if (!state.selectedDestination || !state.selectedDestination.hotels) return;
  const hotel = state.selectedDestination.hotels.find(h => h.id === hotelId);
  if (!hotel) return;

  if (state.itinerary.hotel && state.itinerary.hotel.id === hotelId) {
    state.itinerary.hotel = null;
    addBotMessage(`🗑️ Removed hotel <strong>${hotel.name}</strong> from your stay.`);
  } else {
    state.itinerary.hotel = hotel;
    addBotMessage(`🏨 Selected <strong>${hotel.name}</strong> for your stay.`);
  }
  
  renderHotelsList(state.selectedDestination.hotels);
  updateSummaryBtnState();
  updateContinueButtonState();
  updateBookingStatusTags();
}

window.selectFlight = selectFlight;
window.selectHotel = selectHotel;

function removeItineraryActivity(index) {
  const removed = state.itinerary.activities.splice(index, 1);
  renderPlannerView();
  if (removed.length > 0) {
    addBotMessage(`🗑️ Removed activity: <em>"${removed[0].title}"</em>.`);
  }
}

// Render Planner view
// Render Planner view
function renderPlannerView() {
  const timeline = document.getElementById('timeline-track');
  const emptyState = document.getElementById('planner-empty-state');
  const summaryList = document.getElementById('summary-details-list');
  const totalPriceEl = document.getElementById('summary-total-price');

  if (!state.itinerary.destination) {
    timeline.innerHTML = '';
    emptyState.style.display = 'block';
    summaryList.innerHTML = `<li class="summary-detail-row"><span class="label">Destination</span><span class="val">None selected</span></li>`;
    totalPriceEl.textContent = formatCurrency(0);
    document.getElementById('btn-book-trip').disabled = true;
    return;
  }

  emptyState.style.display = 'none';

  // Render Activities Timeline using semantic h5 headings with single line content
  timeline.innerHTML = state.itinerary.activities.map((act, idx) => `
    <div class="timeline-node">
      <div class="timeline-marker"></div>
      <div class="timeline-card">
        <h6 class="timeline-day-num">Day ${act.day}</h6>
        <div class="timeline-details">
          <span class="timeline-time">${act.time}</span>
          <h4 class="timeline-title">${act.title}</h4>
          <p class="timeline-desc">${act.description}</p>
        </div>
        <button class="btn-remove-node" onclick="removeItineraryActivity(${idx})" aria-label="Remove activity">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
        </button>
      </div>
    </div>
  `).join('');

  // Calculate pricing & update summary safely
  const dest = state.itinerary.destination;
  const flight = state.itinerary.flight;
  const hotel = state.itinerary.hotel;
  
  const destPrice = dest ? parseFloat(dest.price || 0) : 0;
  const flightPrice = flight ? parseFloat(flight.price || flight.pricePerNight || 0) : 0;
  const hotelPrice = hotel ? parseFloat(hotel.pricePerNight || hotel.price || 0) : 0;
  
  const durationDays = state.itinerary.durationDays || (dest ? parseInt(dest.duration) : 7);
  const nights = Math.max(1, durationDays - 1);
  const hotelCost = hotelPrice * nights;

  let detailsHTML = `
    <li class="summary-detail-row">
      <span class="label">
        <svg viewBox="0 0 24 24" width="14" height="14" style="margin-right: 4px; vertical-align: middle;" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10" /><polygon points="12 8 8 12 12 16 16 12 12 8" /></svg>
        ${dest ? dest.name : 'No Destination'} Package
      </span>
      <span class="val">${formatCurrency(destPrice)}</span>
    </li>
  `;

  if (flight) {
    const fNo = flight.flightNo || flight.flightNumber || 'Unknown';
    detailsHTML += `
      <li class="summary-detail-row">
        <span class="label">
          <svg viewBox="0 0 24 24" width="14" height="14" style="margin-right: 4px; vertical-align: middle;" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5l7 2.5z" /></svg>
          Flight: ${fNo}
        </span>
        <span class="val">${formatCurrency(flightPrice)}</span>
      </li>
    `;
  } else {
    detailsHTML += `
      <li class="summary-detail-row" style="color: var(--color-text-secondary);">
        <span class="label">✈️ Flight</span>
        <span class="val">Not selected</span>
      </li>
    `;
  }

  if (hotel) {
    detailsHTML += `
      <li class="summary-detail-row">
        <span class="label">
          <svg viewBox="0 0 24 24" width="14" height="14" style="margin-right: 4px; vertical-align: middle;" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          Stay: ${hotel.name}
        </span>
        <span class="val">${formatCurrency(hotelCost)}</span>
      </li>
    `;
  } else {
    detailsHTML += `
      <li class="summary-detail-row" style="color: var(--color-text-secondary);">
        <span class="label">🏨 Stay</span>
        <span class="val">Not selected</span>
      </li>
    `;
  }

  summaryList.innerHTML = detailsHTML;

  const isBookingValid = !!(flight || hotel);
  
  let baseTotal = 0;
  let taxesFees = 0;
  let serviceFee = 0;
  let grandTotal = 0;
  
  if (isBookingValid) {
    baseTotal = destPrice + flightPrice + hotelCost;
    taxesFees = baseTotal * 0.12;
    serviceFee = baseTotal * 0.05;
    grandTotal = baseTotal + taxesFees + serviceFee;
  }

  const breakdownEl = document.getElementById('summary-pricing-breakdown');
  if (breakdownEl) {
    breakdownEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 0.4rem;">
        <span>Base Total</span>
        <span>${formatCurrency(baseTotal)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 0.4rem;">
        <span>Taxes & Fees (12%)</span>
        <span>${formatCurrency(taxesFees)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 0.4rem;">
        <span>Service Fee (5%)</span>
        <span>${formatCurrency(serviceFee)}</span>
      </div>
    `;
  }

  totalPriceEl.textContent = formatCurrency(grandTotal);

  const bookBtn = document.getElementById('btn-book-trip');
  if (bookBtn) {
    bookBtn.disabled = !isBookingValid;
  }

  // Populate Flight Detail Card
  const flightContainer = document.getElementById('planner-flight-info-content');
  if (flightContainer) {
    if (flight) {
      const fNo = flight.flightNo || flight.flightNumber || 'Unknown';
      flightContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.5rem; color: var(--color-text-primary);">
          <div style="display: flex; justify-content: space-between; font-weight: 600;">
            <span>✈️ ${flight.airline} (${fNo})</span>
            <span>${formatCurrency(flightPrice)}</span>
          </div>
          <div style="font-size: 0.9rem; color: var(--color-text-secondary);">
            <div>Class: <strong style="color: var(--color-text-primary);">${flight.cabin || 'ECONOMY'}</strong></div>
            <div>Departure: <strong>${flight.departure || '08:00 AM'}</strong></div>
            <div>Arrival: <strong>${flight.arrival || '11:30 AM'}</strong></div>
          </div>
        </div>
      `;
    } else {
      flightContainer.innerHTML = `
        <div style="color: var(--color-text-secondary); text-align: center; padding: 1rem 0;">
          <p style="margin-bottom: 1rem;">No flight selected</p>
          <button class="btn-planner-secondary" onclick="navigateToView('dashboard')">Browse Flights</button>
        </div>
      `;
    }
  }

  // Populate Stay Detail Card
  const stayContainer = document.getElementById('planner-stay-info-content');
  if (stayContainer) {
    if (hotel) {
      stayContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.5rem; color: var(--color-text-primary);">
          <div style="display: flex; justify-content: space-between; font-weight: 600;">
            <span>🏨 ${hotel.name}</span>
            <span>${formatCurrency(hotelCost)} (${formatCurrency(hotelPrice)}/night)</span>
          </div>
          <div style="font-size: 0.9rem; color: var(--color-text-secondary);">
            <div>Duration: <strong>${nights} nights</strong></div>
            <div>Room Type: <strong style="color: var(--color-text-primary);">Deluxe Double Room</strong></div>
            <div>Amenities: <strong>${(hotel.amenities && hotel.amenities.join(', ')) || 'Free Wi-Fi, Pool, Spa, Free Breakfast'}</strong></div>
          </div>
        </div>
      `;
    } else {
      stayContainer.innerHTML = `
        <div style="color: var(--color-text-secondary); text-align: center; padding: 1rem 0;">
          <p style="margin-bottom: 1rem;">No accommodation selected</p>
          <button class="btn-planner-secondary" onclick="navigateToView('dashboard')">Browse Stays</button>
        </div>
      `;
    }
  }

  // Recalculate budget statistics
  window.recalculateBudget();

  // Enable/Disable booking button
  updateSummaryBtnState();
}

// Tab switcher for Travel Planner
window.switchPlannerTab = function(tabId) {
  document.querySelectorAll('.planner-tab-content').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.planner-tab-btn').forEach(btn => btn.classList.remove('active'));
  
  const activePanel = document.getElementById(`planner-panel-${tabId}`);
  if (activePanel) activePanel.style.display = 'block';
  
  const activeBtn = document.getElementById(`planner-btn-${tabId}`);
  if (activeBtn) activeBtn.classList.add('active');
};

// Add manual activity in schedule
window.addNewPlannerActivity = function() {
  const day = parseInt(document.getElementById('new-act-day').value) || 1;
  const time = document.getElementById('new-act-time').value.trim() || 'All Day';
  const title = document.getElementById('new-act-title').value.trim();
  
  if (!title) {
    window.showToast("Please provide an activity title.", "error");
    return;
  }
  
  if (!state.itinerary.destination) {
    window.showToast("Please select a destination first.", "error");
    return;
  }
  
  const newActivity = {
    day: day,
    time: time,
    title: title,
    description: 'Custom activity added manually'
  };
  
  state.itinerary.activities.push(newActivity);
  state.itinerary.activities.sort((a, b) => a.day - b.day);
  
  document.getElementById('new-act-time').value = '';
  document.getElementById('new-act-title').value = '';
  
  renderPlannerView();
  window.showToast(`Added activity: "${title}"`, "success");
};

// Trigger AI Recommendations inside chat
window.triggerPlannerAIRecommendations = function() {
  if (!state.itinerary.destination) {
    window.showToast("Please select a destination first.", "error");
    return;
  }
  const destName = state.itinerary.destination.name;
  window.showToast("Opening Co-Pilot recommendations...", "info");
  
  const chatDrawer = document.getElementById('ai-assistant-drawer');
  if (chatDrawer && !chatDrawer.classList.contains('open')) {
    window.toggleAIAssistant();
  }
  
  handleUserMessage(`Give me a daily itinerary with 5 high-rating recommendations for my trip to ${destName}`);
};

// Travel Budget calculations
let selectedCurrency = 'USD';
let currencySymbol = '$';
let conversionRate = 1.0;

window.formatCurrency = function(amount) {
  const parsed = parseFloat(amount || 0);
  if (isNaN(parsed)) return `${currencySymbol}0.00`;
  const converted = parsed * conversionRate;
  return `${currencySymbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

window.recalculateBudget = function() {
  const limitInput = document.getElementById('budget-limit-input');
  if (!limitInput) return;
  
  const limit = parseFloat(limitInput.value) || 5000;
  
  const destPrice = state.itinerary.destination ? parseFloat(state.itinerary.destination.price || 0) : 0;
  const flightPrice = (state.itinerary.flight) ? parseFloat(state.itinerary.flight.price || state.itinerary.flight.pricePerNight || 0) : 0;
  const hotelPrice = (state.itinerary.hotel) ? parseFloat(state.itinerary.hotel.pricePerNight || state.itinerary.hotel.price || 0) : 0;
  
  const dest = state.itinerary.destination;
  const durationDays = state.itinerary.durationDays || (dest ? parseInt(dest.duration) : 7);
  const nights = Math.max(1, durationDays - 1);
  const hotelCost = hotelPrice * nights;
  const activitiesCost = state.itinerary.activities.reduce((sum, act) => sum + (act.price || 0), 0);
  
  const subtotal = destPrice + flightPrice + hotelCost + activitiesCost;
  
  document.getElementById('budget-total-spent').textContent = `${currencySymbol}${Math.round(subtotal * conversionRate).toLocaleString()}`;
  
  const remaining = limit - (subtotal * conversionRate);
  const remainingEl = document.getElementById('budget-remaining');
  remainingEl.textContent = `${currencySymbol}${Math.round(remaining).toLocaleString()}`;
  
  if (remaining < 0) {
    remainingEl.style.color = 'var(--color-accent)';
  } else {
    remainingEl.style.color = 'var(--color-secondary)';
  }
  
  const breakdownList = document.getElementById('budget-breakdown-list');
  if (breakdownList) {
    breakdownList.innerHTML = `
      <li class="summary-detail-row">
        <span class="label">Destination Package</span>
        <span class="val">${currencySymbol}${Math.round(destPrice * conversionRate).toLocaleString()}</span>
      </li>
      <li class="summary-detail-row">
        <span class="label">Flight Tickets</span>
        <span class="val">${currencySymbol}${Math.round(flightPrice * conversionRate).toLocaleString()}</span>
      </li>
      <li class="summary-detail-row">
        <span class="label">Accommodation</span>
        <span class="val">${currencySymbol}${Math.round(hotelCost * conversionRate).toLocaleString()}</span>
      </li>
      <li class="summary-detail-row">
        <span class="label">Daily Activities</span>
        <span class="val">${currencySymbol}${Math.round(activitiesCost * conversionRate).toLocaleString()}</span>
      </li>
    `;
  }
};

window.changePlannerCurrency = function() {
  const currencySelector = document.getElementById('budget-currency-selector');
  if (!currencySelector) return;
  
  selectedCurrency = currencySelector.value;
  if (selectedCurrency === 'USD') {
    currencySymbol = '$';
    conversionRate = 1.0;
  } else if (selectedCurrency === 'EUR') {
    currencySymbol = '€';
    conversionRate = 0.92;
  } else if (selectedCurrency === 'GBP') {
    currencySymbol = '£';
    conversionRate = 0.78;
  } else if (selectedCurrency === 'TRY') {
    currencySymbol = '₺';
    conversionRate = 32.5;
  }
  
  window.recalculateBudget();
  renderPlannerView(); 
};

function updateSummaryBtnState() {
  const bookBtn = document.getElementById('btn-book-trip');
  const isBookingValid = state.itinerary.destination && (state.itinerary.flight || state.itinerary.hotel);
  if (bookBtn) {
    bookBtn.disabled = !isBookingValid;
  }
}

function updateContinueButtonState() {
  const isReady = !!state.itinerary.flight;
  
  const topBtn = document.getElementById('btn-top-continue');
  const bottomBtn = document.getElementById('btn-bottom-continue');
  
  [topBtn, bottomBtn].forEach(btn => {
    if (btn) {
      btn.disabled = !isReady;
    }
  });
}

function updateBookingStatusTags() {
  const statusBar = document.getElementById('detail-status-bar');
  if (!statusBar) return;
  statusBar.innerHTML = '';
  
  const flightDone = !!state.itinerary.flight;
  const hotelDone = !!state.itinerary.hotel;
  
  // Progress tracker element
  const progressDiv = document.createElement('div');
  progressDiv.className = 'booking-progress-tracker';
  progressDiv.innerHTML = `
    <span class="progress-title">Trip Setup:</span>
    <span class="progress-step ${flightDone ? 'done' : 'pending'}">${flightDone ? '✓' : '○'} Flight</span>
    <span class="progress-step ${hotelDone ? 'done' : 'pending'}">${hotelDone ? '✓' : '○'} Hotel</span>
    <span class="progress-step pending">○ Itinerary</span>
  `;
  statusBar.appendChild(progressDiv);
  
  if (flightDone) {
    const flightBadge = document.createElement('span');
    flightBadge.className = 'status-badge-pill success';
    flightBadge.innerHTML = '✓ Flight Added';
    statusBar.appendChild(flightBadge);
  }
  
  if (hotelDone) {
    const hotelBadge = document.createElement('span');
    hotelBadge.className = 'status-badge-pill success';
    hotelBadge.innerHTML = '✓ Hotel Selected';
    statusBar.appendChild(hotelBadge);
  }
}

window.updateContinueButtonState = updateContinueButtonState;
window.updateBookingStatusTags = updateBookingStatusTags;

// -------------------------------------------------------------
// Interactive AI Chat Assistant Simulator
// -------------------------------------------------------------
// Global memory state for concierge
state.conciergeMemory = state.conciergeMemory || {
  destination: null,
  budget: null,
  dates: null,
  companions: null,
  hotelStyle: null,
  flightClass: null,
  diet: null,
  activities: []
};

function handleSuggestionClick(text) {
  const t = text.toLowerCase();
  
  if (t.includes('show on map') || t.includes('open map') || t.includes('view map')) {
    addBotMessage("🗺️ <strong>Opening the interactive map...</strong> Plotting premium locations: Voyara Grand Sovereign, international airport, local dining, historical temples, and transit hubs with walking distances.");
    if (window.showPremiumMapDetails) {
      window.showPremiumMapDetails('kyoto');
    }
    return;
  }
  
  if (t.includes('view flights') || t.includes('compare flights') || t.includes('find cheaper flights')) {
    addBotMessage("✈️ <strong>Navigating to flight selections...</strong>");
    const flightSec = document.querySelector('.detail-flights-card');
    if (flightSec) {
      flightSec.scrollIntoView({ behavior: 'smooth' });
    }
    return;
  }
  
  if (t.includes('view hotels') || t.includes('view hotel') || t.includes('compare hotels') || t.includes('luxury hotels')) {
    addBotMessage("🏨 <strong>Navigating to recommended stays...</strong>");
    const hotelSec = document.querySelector('.detail-hotels-card');
    if (hotelSec) {
      hotelSec.scrollIntoView({ behavior: 'smooth' });
    }
    return;
  }
  
  if (t.includes('add flight')) {
    if (state.selectedDestination && state.selectedDestination.flights && state.selectedDestination.flights[0]) {
      const fl = state.selectedDestination.flights[0];
      selectFlight(fl.id);
      addBotMessage(`✈️ Added flight <strong>${fl.airline} (${fl.flightNumber})</strong> to your itinerary.`);
    } else {
      addBotMessage("Please select a destination first before adding flights.");
    }
    return;
  }
  
  if (t.includes('create itinerary') || t.includes('plan 5-day')) {
    if (state.selectedDestination) {
      if (!state.itinerary.flight && state.selectedDestination.flights[0]) {
        selectFlight(state.selectedDestination.flights[0].id);
      }
      if (!state.itinerary.hotel && state.selectedDestination.hotels[0]) {
        selectHotel(state.selectedDestination.hotels[0].id);
      }
      navigateToView('planner');
      addBotMessage("🗓️ I've loaded your destination overview, flight details, and luxury stays directly into your itinerary planner!");
    } else {
      addBotMessage("Please select a destination first before building the itinerary.");
    }
    return;
  }
  
  handleUserMessage(text);
}

function updateSuggestions(chips) {
  const container = document.getElementById('chat-suggestions');
  if (!container) return;
  container.innerHTML = chips.map(c => `
    <span class="suggestion-chip" onclick="handleSuggestionClick('${c}')">${c}</span>
  `).join('');
}

let chatHistory = [];

async function handleUserMessage(text) {
  // Add User Bubble to Chat Logs
  const logs = document.getElementById('chat-logs');
  if (logs) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble user';
    bubble.textContent = text;
    logs.appendChild(bubble);
    logs.scrollTop = logs.scrollHeight;
  }

  // Parse smart memory attributes from user message
  const t = text.toLowerCase();
  if (t.includes('kyoto') || t.includes('japan')) state.conciergeMemory.destination = 'Kyoto, Japan';
  if (t.includes('amalfi') || t.includes('italy')) state.conciergeMemory.destination = 'Amalfi Coast, Italy';
  if (t.includes('reykjavik') || t.includes('iceland')) state.conciergeMemory.destination = 'Reykjavik, Iceland';
  
  if (t.includes('budget') || t.includes('cost') || t.includes('price')) {
    const numMatch = t.match(/\d+/);
    if (numMatch) state.conciergeMemory.budget = `$${numMatch[0]}`;
  }
  if (t.includes('business')) state.conciergeMemory.flightClass = 'Business';
  if (t.includes('first class')) state.conciergeMemory.flightClass = 'First Class';
  if (t.includes('economy')) state.conciergeMemory.flightClass = 'Economy';
  
  if (t.includes('vegetarian') || t.includes('vegan') || t.includes('gluten')) {
    state.conciergeMemory.diet = t.includes('vegetarian') ? 'Vegetarian' : (t.includes('vegan') ? 'Vegan' : 'Gluten-Free');
  }

  // Show active memory parameters as an agent action log if stored
  if (Object.values(state.conciergeMemory).some(v => v !== null)) {
    const activeParams = Object.keys(state.conciergeMemory)
      .filter(k => state.conciergeMemory[k] !== null)
      .map(k => `${k}: ${JSON.stringify(state.conciergeMemory[k])}`)
      .join(', ');
    addAgentActionLog('concierge-memory-recall', activeParams);
  }

  chatHistory.push({ role: 'user', content: text });

  // Show typing indicator in chat logs
  if (logs) {
    const typing = document.createElement('div');
    typing.className = 'typing-indicator';
    typing.id = 'chat-typing-indicator';
    typing.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    logs.appendChild(typing);
    logs.scrollTop = logs.scrollHeight;
  }

  // Update Status Text in voice assistant
  const statusText = document.getElementById('voice-status-text');
  if (statusText) statusText.textContent = "Thinking...";

  try {
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages: chatHistory })
    });

    const typingIndicator = document.getElementById('chat-typing-indicator');
    if (typingIndicator) typingIndicator.remove();

    if (!res.ok) throw new Error('API request failed');
    const data = await res.json();

    // Render backend actions if any
    if (data.actions && data.actions.length > 0) {
      data.actions.forEach(action => {
        addAgentActionLog(action.tool, JSON.stringify(action.args));
        executeClientSideToolAction(action.tool, action.args);
      });
    }

    addBotMessage(data.content);
    chatHistory.push({ role: 'assistant', content: data.content });
    
    // Automatically update suggestions dynamically according to keywords
    const contentLower = data.content.toLowerCase();
    if (contentLower.includes('kyoto') || contentLower.includes('japan')) {
      updateSuggestions([
        '🗺️ Show on Map',
        '✈️ View Flights',
        '🏨 View Hotels',
        '🗓️ Create Itinerary',
        'Plan 5-Day Kyoto Trip',
        'Luxury Hotels',
        'Find Cheaper Flights'
      ]);
    } else if (contentLower.includes('hotel') || contentLower.includes('stay') || contentLower.includes('grand sovereign')) {
      updateSuggestions([
        '🏨 View Hotel',
        '🗺️ Open Map',
        '🏨 Compare Hotels',
        'Luxury Hotels',
        'Local Restaurants'
      ]);
    } else if (contentLower.includes('flight') || contentLower.includes('premium air')) {
      updateSuggestions([
        '✈️ Add Flight',
        '✈️ Compare Flights',
        'Find Cheaper Flights',
        'Travel Tips'
      ]);
    } else if (contentLower.includes('budget') || contentLower.includes('total') || contentLower.includes('cost')) {
      updateSuggestions([
        'Find Cheaper Flights',
        'Travel Tips',
        'Plan 5-Day Kyoto Trip'
      ]);
    }

  } catch (err) {
    console.error('API assistant failed, routing to local simulator:', err);
    const typingIndicator = document.getElementById('chat-typing-indicator');
    if (typingIndicator) typingIndicator.remove();

    parseAndReply(text);
  }
}

function executeClientSideToolAction(tool, args) {
  if (tool === 'searchFlights' || tool === 'searchHotels') {
    const destId = Object.keys(destinationIataMap).find(
      key => destinationIataMap[key] === args.destination || destinationIataMap[key] === args.cityCode
    );
    if (destId) {
      selectDestination(destId);
    }
  }
}

// Simple rule-based Natural Language router simulating the AI Agent co-pilot
function parseAndReply(text) {
  const t = text.toLowerCase();
  let reply = "";
  let actionLog = null;
  let suggestionsList = [
    'Explore Kyoto 🌸',
    'Amalfi Itinerary 🍋',
    'Iceland Hotels ❄️',
    'Plan 5-Day Kyoto Trip'
  ];

  // 1. Navigation / Destination Searches
  if (t.includes('kyoto') || t.includes('japan')) {
    actionLog = { tool: 'select-destination', details: 'id="kyoto"' };
    setTimeout(() => selectDestination('kyoto'), 500);
    reply = `Kyoto is a fantastic choice, especially during spring and autumn.
<br><br>
Here's a quick overview:
<br><br>
📍 <strong>Destination</strong><br>Kyoto, Japan
<br><br>
🌤 <strong>Weather</strong><br>22°C · Sunny this week
<br><br>
✈ <strong>Flights</strong><br>Starting from $520
<br><br>
🏨 <strong>Recommended Stay</strong><br>Voyara Grand Sovereign ($320/night)
<br><br>
💰 <strong>Estimated Trip Cost</strong><br>Approximately $2,850 for 6 days including flights and accommodation.
<br><br>
Would you like me to build a complete itinerary?`;

    suggestionsList = [
      '🗺️ Show on Map',
      '✈️ View Flights',
      '🏨 View Hotels',
      '🗓️ Create Itinerary',
      'Plan 5-Day Kyoto Trip',
      'Luxury Hotels',
      'Find Cheaper Flights'
    ];
  } else if (t.includes('amalfi') || t.includes('italy')) {
    actionLog = { tool: 'select-destination', details: 'id="amalfi"' };
    setTimeout(() => selectDestination('amalfi'), 500);
    reply = "Showing details for the breathtaking Amalfi Coast. I've populated the itinerary planner with lemon grove tours and clifftop hikes. Shall we book a room at Hotel Poseidon?";
    suggestionsList = [
      '🗺️ Show on Map',
      '✈️ View Flights',
      '🏨 View Hotels',
      '🗓️ Create Itinerary'
    ];
  } else if (t.includes('iceland') || t.includes('reykjavik')) {
    actionLog = { tool: 'select-destination', details: 'id="reykjavik"' };
    setTimeout(() => selectDestination('reykjavik'), 500);
    reply = "Here's the Reykjavik & Southern Coast portal! I have set up your northern lights tracking agenda. Let me know if you would like me to add flights or hotels.";
    suggestionsList = [
      '🗺️ Show on Map',
      '✈️ View Flights',
      '🏨 View Hotels',
      '🗓️ Create Itinerary'
    ];
  } else if (t.includes('patagonia')) {
    actionLog = { tool: 'select-destination', details: 'id="patagonia"' };
    setTimeout(() => selectDestination('patagonia'), 500);
    reply = "Navigated to the Patagonia Wilderness portal. A robust hiking itinerary is now active in your planner.";
  } else if (t.includes('petra') || t.includes('jordan')) {
    actionLog = { tool: 'select-destination', details: 'id="petra"' };
    setTimeout(() => selectDestination('petra'), 500);
    reply = "Navigated to the Petra & Wadi Rum portal. Your desert camping agenda is ready.";

  // 2. adding flights / flight queries
  } else if (t.includes('add flight') || t.includes('flight') || t.includes('airlines') || t.includes('fly') || t.includes('airfare')) {
    if (!state.selectedDestination) {
      reply = "Please explore a destination first (e.g. Kyoto or Amalfi Coast) before checking flights.";
    } else {
      const fl = state.selectedDestination.flights[0];
      if (t.includes('add')) {
        actionLog = { tool: 'add-itinerary-item', details: `flightId="${fl.id}"` };
        setTimeout(() => selectFlight(fl.id), 500);
        reply = `I have automatically selected and added the <strong>${fl.airline} (${fl.flightNo})</strong> flight to your itinerary. Total pricing updated!`;
      } else {
        reply = `I found the best option for your travel dates:
<br><br>
✈️ <strong>Voyara Premium Air</strong>
<br>
Departure: 09:00 AM
<br>
Duration: 6h 45m (Economy)
<br>
Price: $520
<br><br>
Would you like me to add this flight to your trip?`;
      }
      suggestionsList = [
        '✈️ Add Flight',
        '✈️ Compare Flights',
        'Find Cheaper Flights',
        'Travel Tips'
      ];
    }

  // 3. adding hotels / hotel queries
  } else if (t.includes('hotel') || t.includes('stay') || t.includes('ryokan') || t.includes('retreat') || t.includes('lodging')) {
    if (!state.selectedDestination) {
      reply = "Please pick a destination first so I can fetch recommended stays.";
    } else {
      let ht = state.selectedDestination.hotels[0];
      if (t.includes('hoshinoya')) {
        ht = state.selectedDestination.hotels.find(h => h.id.includes('ky-2')) || ht;
      }
      
      if (t.includes('add') || t.includes('book')) {
        actionLog = { tool: 'add-itinerary-item', details: `hotelId="${ht.id}"` };
        setTimeout(() => selectHotel(ht.id), 500);
        reply = `I have booked your stay at the <strong>${ht.name}</strong> and added it to your itinerary timeline.`;
      } else {
        reply = `I found a hotel that matches your preferences:
<br><br>
🏨 <strong>Voyara Grand Sovereign</strong>
<br>
★★★★★ 4.9 · Central District
<br><br>
🍳 Free Breakfast · 💆 Spa & Wellness · ❌ Free Cancellation
<br>
💵 $320/night (Only 1.2 km from Kyoto city center)
<br><br>
Would you like to see photos, amenities, reviews, or book this hotel?`;
      }
      suggestionsList = [
        '🏨 View Hotel',
        '🗺️ Open Map',
        '🏨 Compare Hotels',
        'Luxury Hotels',
        'Local Restaurants'
      ];
    }

  // 4. Checkout flow
  } else if (t.includes('checkout') || t.includes('reserve')) {
    if (!state.itinerary.destination || !state.itinerary.flight || !state.itinerary.hotel) {
      reply = "You must select a destination, a flight, and a hotel in the planner before initiating a booking! Ask me to 'show Kyoto' and 'add flight' first.";
    } else {
      actionLog = { tool: 'open-booking-flow', details: `destination="${state.itinerary.destination.id}"` };
      setTimeout(() => openBookingDialog(), 500);
      reply = "Perfect, I've launched the checkout portal for your complete reservation. Please review the details in the dialog popup.";
    }

  // 5. Budget queries
  } else if (t.includes('budget') || t.includes('cost') || t.includes('price') || t.includes('how much')) {
    reply = `Here is the estimated cost breakdown for your trip:<br><br>
<strong>Estimated Cost:</strong><br>
✈️ Flights: $520<br>
🏨 Hotel: $320 × 6 nights = $1,920<br>
🍔 Food: ≈ $300<br>
🎟️ Activities: ≈ $250<br>
🚕 Transportation: ≈ $80<br>
────────────────────<br>
💰 <strong>Estimated Total: $3,070</strong><br><br>
I can also suggest ways to reduce your budget while keeping the same experience.`;
    suggestionsList = [
      'Find Cheaper Flights',
      'Travel Tips',
      'Plan 5-Day Kyoto Trip'
    ];

  // 6. Help / Greeting
  } else {
    reply = "I'm here to assist! Try typing: <ul><li><em>'Show me Kyoto, Japan'</em></li><li><em>'Add flight to my Kyoto itinerary'</em></li><li><em>'Plan a romantic trip to Amalfi Coast'</em></li><li><em>'Book my trip'</em></li></ul>";
  }

  // If a tool was triggered, log the "Agent Action" in the chat feed
  if (actionLog) {
    addAgentActionLog(actionLog.tool, actionLog.details);
  }

  // Stream text
  setTimeout(() => {
    addBotMessage(reply);
    updateSuggestions(suggestionsList);
  }, 300);
}

function addAgentActionLog(tool, details) {
  console.log(`[Agent running: ${tool}] ${details}`);
}

function addBotMessage(htmlContent) {
  // Add Bot Bubble to Chat Logs
  const logs = document.getElementById('chat-logs');
  let bubble = null;
  if (logs) {
    bubble = document.createElement('div');
    bubble.className = 'chat-bubble bot';
    bubble.innerHTML = htmlContent;
    logs.appendChild(bubble);
    logs.scrollTop = logs.scrollHeight;
  }

  // Update voice status text to ready
  const statusText = document.getElementById('voice-status-text');
  const statusLight = document.getElementById('voice-status-light');

  // Speak response if voice output is enabled
  if (state.voiceOutput) {
    speakText(stripHtml(htmlContent), bubble);
  } else {
    if (statusLight) statusLight.className = 'chat-bot-indicator finished';
    if (statusText) statusText.textContent = "✓ Finished";
    setTimeout(() => {
      if (!state.isSpeaking && !state.isListening && !state.isThinking) {
        if (statusLight) statusLight.className = 'chat-bot-indicator';
        if (statusText) statusText.textContent = "Voyara Assistant";
      }
    }, 2000);
  }
  
  return bubble;
}

// -------------------------------------------------------------
// Voice Assistant Features (Web Speech API)
// -------------------------------------------------------------

function toggleSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Speech recognition is not supported in this browser. Try Chrome or Safari.");
    return;
  }

  const micBtn = document.getElementById('btn-chat-mic');
  const statusLight = document.getElementById('voice-status-light');
  const statusText = document.getElementById('voice-status-text');

  const setListeningUI = (listening) => {
    if (listening) {
      if (micBtn) {
        micBtn.classList.add('listening');
        micBtn.setAttribute('aria-label', 'Stop voice input');
      }
      if (statusLight) statusLight.classList.add('active');
      if (statusText) statusText.textContent = "Listening...";
    } else {
      if (micBtn) {
        micBtn.classList.remove('listening');
        micBtn.setAttribute('aria-label', 'Start voice input');
      }
      if (statusLight) statusLight.classList.remove('active');
      if (statusText) statusText.textContent = "Voyara Assistant";
    }
  };

  if (state.isListening) {
    if (recognition) recognition.stop();
    return;
  }

  if (!recognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
      state.isListening = true;
      setListeningUI(true);
      
      // Mute active speech synthesis when user talks
      window.speechSynthesis.cancel();
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const input = document.getElementById('chat-input-field');
      if (input) {
        input.value = transcript;
      }
      handleUserMessage(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      state.isListening = false;
      setListeningUI(false);
      
      if (event.error === 'not-allowed') {
        addBotMessage("🎙️ <strong>Microphone Access Blocked.</strong> Please enable microphone permission in your browser settings to use the voice assistant.");
      } else if (event.error !== 'aborted') {
        addBotMessage("🎙️ <strong>Voice Input Error:</strong> " + event.error);
      }
    };

    recognition.onend = () => {
      state.isListening = false;
      setListeningUI(false);
    };
  }

  try {
    recognition.start();
  } catch (err) {
    console.error("Error starting recognition:", err);
  }
}

function speakText(text, bubble = null) {
  if (!window.speechSynthesis) return;

  // Stop any currently playing speech immediately
  window.speechSynthesis.cancel();

  state.isSpeaking = true;
  const statusLight = document.getElementById('voice-status-light');
  const statusText = document.getElementById('voice-status-text');

  if (statusLight) statusLight.className = 'chat-bot-indicator speaking';
  if (statusText) statusText.textContent = "🗣 Speaking";
  if (bubble) bubble.classList.add('speaking-active');

  // 1. Text Cleaning for humanized pronunciation
  let cleanedText = text
    .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "") // remove emojis
    .replace(/<li>/g, "")
    .replace(/<\/li>/g, ", ")
    .replace(/<ul>/g, "")
    .replace(/<\/ul>/g, "")
    .replace(/<strong>/g, "")
    .replace(/<\/strong>/g, "")
    .replace(/<em>/g, "")
    .replace(/<\/em>/g, "")
    // Convert price tags from e.g. "$1,850" to "1850 dollars"
    .replace(/\$(\d+[\d,]*)/g, (match, p1) => {
      return p1.replace(/,/g, "") + " dollars";
    })
    // Convert flight abbreviations to spaced letters
    .replace(/\bJL-(\d+)\b/gi, "J L flight $1")
    .replace(/\bNH-(\d+)\b/gi, "N H flight $1")
    .replace(/\bSQ-(\d+)\b/gi, "S Q flight $1")
    .replace(/\bAZ-(\d+)\b/gi, "A Z flight $1")
    .replace(/\bLH-(\d+)\b/gi, "L H flight $1")
    .replace(/\bDL-(\d+)\b/gi, "D L flight $1")
    .replace(/\bUA-(\d+)\b/gi, "U A flight $1")
    .replace(/\bFI-(\d+)\b/gi, "F I flight $1")
    .replace(/\bOG-(\d+)\b/gi, "O G flight $1")
    .replace(/\bLA-(\d+)\b/gi, "L A flight $1")
    .replace(/\bAR-(\d+)\b/gi, "A R flight $1")
    .replace(/\bRJ-(\d+)\b/gi, "R J flight $1")
    .replace(/\bTK-(\d+)\b/gi, "T K flight $1")
    // Convert "Ryokan" and complex words to phonetic spelling for better EN pronunciation
    .replace(/\bryokan\b/gi, "ryo-kan")
    .replace(/\bryokans\b/gi, "ryo-kans")
    .replace(/\best\./gi, "estimated")
    .replace(/\bpkg\b/gi, "package")
    .replace(/\be\.g\./gi, "for example")
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanedText);
  utterance.lang = 'en-US';
  
  // Slower, warmer, more thoughtful pace for a premium travel agent
  utterance.rate = 0.88; 
  utterance.pitch = 1.0;

  // 2. High-Quality Natural Voice Selection
  const voices = window.speechSynthesis.getVoices();
  const preferredVoiceNames = [
    "Google US English",
    "Samantha",
    "Daniel",
    "Karen",
    "Serena",
    "Microsoft Zira",
    "Microsoft David",
    "Microsoft Natural",
    "Alex",
    "Moira",
    "Fiona"
  ];
  
  let selectedVoice = null;
  for (const name of preferredVoiceNames) {
    selectedVoice = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
    if (selectedVoice) break;
  }

  if (!selectedVoice) {
    selectedVoice = voices.find(v => v.lang.startsWith('en'));
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  const cleanUpSpeechState = () => {
    state.isSpeaking = false;
    if (bubble) bubble.classList.remove('speaking-active');
    
    if (statusLight) statusLight.className = 'chat-bot-indicator finished';
    if (statusText) statusText.textContent = "✓ Finished";
    setTimeout(() => {
      // Only reset if we haven't transitioned to another active task
      if (!state.isSpeaking && !state.isListening && !state.isThinking) {
        if (statusLight) statusLight.className = 'chat-bot-indicator';
        if (statusText) statusText.textContent = "Voyara Assistant";
      }
    }, 2000);
  };

  utterance.onend = cleanUpSpeechState;
  utterance.onerror = cleanUpSpeechState;

  window.speechSynthesis.speak(utterance);
}

function stripHtml(html) {
  let doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
}

// Toggle mobile sidebar
function toggleMobileChat() {
  const panel = document.getElementById('ai-chat-panel');
  panel.classList.toggle('open-panel');
}

// -------------------------------------------------------------
// Booking Wizard Dialog Controller
// -------------------------------------------------------------
function openBookingDialog() {
  const dialog = document.getElementById('booking-dialog');
  if (!state.itinerary.destination) return;

  const dest = state.itinerary.destination;
  const flight = state.itinerary.flight;
  const hotel = state.itinerary.hotel;
  
  const destPrice = dest ? parseFloat(dest.price || 0) : 0;
  const flightPrice = flight ? parseFloat(flight.price || flight.pricePerNight || 0) : 0;
  const hotelPrice = hotel ? parseFloat(hotel.pricePerNight || hotel.price || 0) : 0;
  
  const durationDays = state.itinerary.durationDays || (dest ? parseInt(dest.duration) : 7);
  const nights = Math.max(1, durationDays - 1);
  const hotelCost = hotelPrice * nights;
  
  const baseTotal = destPrice + flightPrice + hotelCost;
  const taxesFees = baseTotal * 0.12;
  const serviceFee = baseTotal * 0.05;
  const grandTotal = baseTotal + taxesFees + serviceFee;

  // Populate Summary
  const summaryBox = document.getElementById('modal-summary-content');
  const fNo = flight ? (flight.flightNo || flight.flightNumber || 'Unknown') : '';
  summaryBox.innerHTML = `
    <div class="booking-summary-row">
      <span>Destination:</span>
      <span class="val">${dest.name} (${durationDays} Days)</span>
    </div>
    <div class="booking-summary-row">
      <span>Flight:</span>
      <span class="val">${flight ? `${flight.airline} (${fNo})` : 'Not selected'}</span>
    </div>
    <div class="booking-summary-row">
      <span>Hotel:</span>
      <span class="val">${hotel ? `${hotel.name} (${nights} nights)` : 'Not selected'}</span>
    </div>
    <div class="booking-summary-row total">
      <span>Total Payment Due:</span>
      <span>${formatCurrency(grandTotal)}</span>
    </div>
  `;

  // Reset steps
  state.wizardStep = 1;
  updateWizardUI();

  // Reset Success panels
  document.getElementById('booking-payment-fields').style.display = 'block';
  document.getElementById('booking-payment-footer').style.display = 'flex';
  document.getElementById('booking-success-animation').style.display = 'none';
  document.getElementById('booking-success-footer').style.display = 'none';

  dialog.showModal();
}

function closeBookingDialog() {
  const dialog = document.getElementById('booking-dialog');
  dialog.close();
}

function nextWizardStep() {
  if (state.wizardStep === 2) {
    // Validate Step 2 Inputs
    const passport = document.getElementById('traveler-passport').value.trim();
    if (!passport) {
      alert('Passport number is required to proceed.');
      return;
    }
  }

  state.wizardStep++;
  updateWizardUI();
}

function prevWizardStep() {
  state.wizardStep--;
  updateWizardUI();
}

function updateWizardUI() {
  document.querySelectorAll('.wizard-form-step').forEach((step, idx) => {
    step.classList.toggle('active', idx + 1 === state.wizardStep);
  });

  document.querySelectorAll('.step-indicator').forEach((ind, idx) => {
    ind.classList.toggle('active', idx + 1 === state.wizardStep);
    ind.classList.toggle('complete', idx + 1 < state.wizardStep);
  });
}

function confirmFinalBooking() {
  const card = document.getElementById('card-num').value.trim();
  const expiry = document.getElementById('card-expiry').value.trim();
  const cvv = document.getElementById('card-cvv').value.trim();

  if (!card || !expiry || !cvv) {
    alert('Please enter valid credit card details to proceed.');
    return;
  }

  // Simulate payment processing
  const fields = document.getElementById('booking-payment-fields');
  const footer = document.getElementById('booking-payment-footer');
  fields.style.display = 'none';
  footer.style.display = 'none';

  // Add a simple loader mock
  const loader = document.createElement('div');
  loader.id = 'modal-payment-loader';
  loader.style.textAlign = 'center';
  loader.style.padding = '3rem 0';
  loader.innerHTML = `
    <div class="typing-indicator" style="margin: 0 auto 1.5rem; justify-content: center; align-self: center;">
      <div class="typing-dot" style="background-color: var(--color-secondary);"></div>
      <div class="typing-dot" style="background-color: var(--color-secondary);"></div>
      <div class="typing-dot" style="background-color: var(--color-secondary);"></div>
    </div>
    <p style="color: var(--color-text-secondary); font-size: 0.95rem;">Authorizing Payment...</p>
  `;
  document.getElementById('wizard-step-3').appendChild(loader);

  setTimeout(() => {
    loader.remove();

    // Show success
    document.getElementById('booking-success-animation').style.display = 'block';
    document.getElementById('booking-success-footer').style.display = 'flex';

    // Sync to Supabase before resetting state
    saveItineraryToSupabase();

    // Update status in chat
    addBotMessage(`🎉 <strong>Booking Successful!</strong> Your trip to ${state.itinerary.destination.name} has been locked in. Happy travels!`);

    // Reset itinerary State
    state.itinerary = {
      destination: null,
      flight: null,
      hotel: null,
      activities: []
    };
    renderPlannerView();
  }, 1800);
}

// -------------------------------------------------------------
// WebMCP Imperative AI Tool Registration (Chrome 146+)
// -------------------------------------------------------------
function initWebMCP() {
  const modelContext = document.modelContext || navigator.modelContext;
  if (!modelContext || !('registerTool' in modelContext)) {
    console.log("WebMCP not supported natively in this browser context. Running simulated assistant.");
    return;
  }

  try {
    // 1. Search Destinations Tool
    modelContext.registerTool({
      name: "search_destinations",
      description: "Search and filter Voyara's luxury travel catalog. Supports filtering by country name, max budget in USD, or duration in days.",
      inputSchema: {
        type: "object",
        properties: {
          country: { type: "string", description: "Filter by destination name or country (e.g. Japan, Italy)." },
          maxPrice: { type: "number", description: "Maximum budget limit in USD." },
          duration: { type: "string", description: "Exact travel duration, e.g. '5', '6', '7', '8'." }
        }
      },
      execute({ country, maxPrice, duration }) {
        applyFilters({ country, maxPrice, duration });
        return {
          status: "success",
          matchesFound: state.filteredDestinations.length,
          destinations: state.filteredDestinations.map(d => ({ id: d.id, name: d.name, price: d.price }))
        };
      },
      annotations: { readOnlyHint: true }
    });

    // 2. Select Destination Tool
    modelContext.registerTool({
      name: "select_destination",
      description: "Selects a destination from the list and displays details including flights, hotels, and default activities.",
      inputSchema: {
        type: "object",
        properties: {
          destinationId: { type: "string", description: "The ID of the destination (e.g. 'kyoto', 'amalfi')." }
        },
        required: ["destinationId"]
      },
      execute({ destinationId }) {
        const dest = window.travelDestinations.find(d => d.id === destinationId);
        if (!dest) throw new Error("Destination not found.");

        selectDestination(destinationId);
        return {
          status: "success",
          destinationSelected: dest.name,
          flightsAvailable: dest.flights,
          hotelsAvailable: dest.hotels
        };
      }
    });

    // 3. Add Flight Tool
    modelContext.registerTool({
      name: "add_flight_to_itinerary",
      description: "Adds a specific flight to the active itinerary planner.",
      inputSchema: {
        type: "object",
        properties: {
          flightId: { type: "string", description: "The flight ID to select." }
        },
        required: ["flightId"]
      },
      execute({ flightId }) {
        if (!state.selectedDestination) throw new Error("Must select a destination first.");
        const flight = state.selectedDestination.flights.find(f => f.id === flightId);
        if (!flight) throw new Error("Flight ID invalid for this destination.");

        selectFlight(flightId);
        return { status: "success", flightAdded: flight.flightNo, price: flight.price };
      }
    });

    // 4. Add Hotel Tool
    modelContext.registerTool({
      name: "add_hotel_to_itinerary",
      description: "Adds a stay at a recommended hotel/ryokan to the active itinerary.",
      inputSchema: {
        type: "object",
        properties: {
          hotelId: { type: "string", description: "The hotel ID to select." }
        },
        required: ["hotelId"]
      },
      execute({ hotelId }) {
        if (!state.selectedDestination) throw new Error("Must select a destination first.");
        const hotel = state.selectedDestination.hotels.find(h => h.id === hotelId);
        if (!hotel) throw new Error("Hotel ID invalid for this destination.");

        selectHotel(hotelId);
        return { status: "success", hotelAdded: hotel.name, pricePerNight: hotel.pricePerNight };
      }
    });

    // 5. Open Booking Flow Tool
    modelContext.registerTool({
      name: "initiate_checkout",
      description: "Launches the payment checkout view. Must have a destination, flight, and hotel selected in the planner first.",
      inputSchema: { type: "object", properties: {} },
      execute() {
        if (!state.itinerary.destination || !state.itinerary.flight || !state.itinerary.hotel) {
          throw new Error("Cannot checkout. Itinerary is incomplete.");
        }
        window.startCheckoutFlow();
        return { status: "success", message: "Checkout dashboard launched." };
      }
    });

    console.log("WebMCP native tools successfully registered.");

  } catch (error) {
    console.error("Failed to register WebMCP tools:", error);
  }
}

// -------------------------------------------------------------
// Voyara Premium Multi-Step Booking & Checkout Flow
// -------------------------------------------------------------
let promoApplied = false;
let promoDiscount = 0;
let checkoutGuests = 1;

window.startCheckoutFlow = function() {
  if (!state.itinerary.destination || !state.itinerary.flight || !state.itinerary.hotel) {
    alert("Please select a destination, flight, and hotel first before booking.");
    return;
  }
  
  if (!state.userSession) {
    window.showToast("Please sign in to proceed with booking.", "info");
    window.showAuthScreen('checkout');
    return;
  }
  
  // Navigate to checkout view
  navigateToView('checkout');
  
  // Set default dates
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + 30);
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 37);
  
  document.getElementById('checkout-start-date').value = startDate.toISOString().split('T')[0];
  document.getElementById('checkout-end-date').value = endDate.toISOString().split('T')[0];
  
  // Fill sidebar details
  document.getElementById('summary-dest-title').textContent = state.itinerary.destination ? state.itinerary.destination.name : 'No destination selected';
  document.getElementById('summary-flight-offer').textContent = state.itinerary.flight ? `${state.itinerary.flight.airline} (${state.itinerary.flight.cabin})` : 'No flight selected';
  document.getElementById('summary-hotel-stay').textContent = state.itinerary.hotel ? state.itinerary.hotel.name : 'No accommodation selected';
  
  // Populate add-on activities
  const activityList = state.itinerary.activities.map(act => act.name).join(', ') || 'None selected';
  document.getElementById('summary-activities-list').textContent = activityList;

  // Initialize variables
  checkoutGuests = 1;
  document.getElementById('checkout-guests-count').textContent = checkoutGuests;
  promoApplied = false;
  promoDiscount = 0;
  document.getElementById('checkout-promo').value = '';
  document.getElementById('promo-status-msg').textContent = '';
  document.getElementById('calc-discount-row').style.display = 'none';
  
  // Reset payment stepper and forms
  setStepperStep(1);
  
  window.recalculatePrices();
};

window.adjustCheckoutGuests = function(val) {
  checkoutGuests += val;
  if (checkoutGuests < 1) checkoutGuests = 1;
  if (checkoutGuests > 10) checkoutGuests = 10;
  document.getElementById('checkout-guests-count').textContent = checkoutGuests;
  window.recalculatePrices();
};

window.applyPromoCode = function() {
  const code = document.getElementById('checkout-promo').value.trim().toUpperCase();
  const statusMsg = document.getElementById('promo-status-msg');
  if (code === 'VOYARA15') {
    promoApplied = true;
    statusMsg.textContent = '✅ Promo code VOYARA15 applied! (15% discount)';
    statusMsg.style.color = 'var(--color-secondary)';
  } else if (code === 'WELCOME') {
    promoApplied = true;
    statusMsg.textContent = '✅ Promo code WELCOME applied! ($50 discount)';
    statusMsg.style.color = 'var(--color-secondary)';
  } else if (code === '') {
    promoApplied = false;
    statusMsg.textContent = '';
  } else {
    promoApplied = false;
    statusMsg.textContent = '❌ Invalid promo code';
    statusMsg.style.color = 'var(--color-accent)';
  }
  window.recalculatePrices();
};

window.recalculatePrices = function() {
  const startDateVal = document.getElementById('checkout-start-date').value;
  const endDateVal = document.getElementById('checkout-end-date').value;
  
  let nights = 7;
  if (startDateVal && endDateVal) {
    const start = new Date(startDateVal);
    const end = new Date(endDateVal);
    const diff = end - start;
    if (diff > 0) {
      nights = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
  }
  
  // Get prices safely
  const destPrice = state.itinerary.destination ? (state.itinerary.destination.price || 0) : 0;
  const flightPrice = (state.itinerary.flight && state.itinerary.flight.price) ? state.itinerary.flight.price : 0;
  const hotelPrice = (state.itinerary.hotel && state.itinerary.hotel.pricePerNight) ? state.itinerary.hotel.pricePerNight : (state.itinerary.hotel && state.itinerary.hotel.price) ? state.itinerary.hotel.price : 0;
  
  // Room tier upgrade cost
  const roomTier = document.getElementById('checkout-room-tier').value;
  let upgradePrice = 0;
  if (roomTier === 'suite') upgradePrice = 100;
  if (roomTier === 'villa') upgradePrice = 250;
  
  // Activities cost
  const activitiesCost = state.itinerary.activities.reduce((sum, act) => sum + (act.price || 0), 0);
  
  // Calculate Base Total including Destination Package
  const baseTotal = (destPrice * checkoutGuests) +
                    (hotelPrice * nights * checkoutGuests) + 
                    (upgradePrice * nights * checkoutGuests) + 
                    (flightPrice * checkoutGuests) + 
                    (activitiesCost * checkoutGuests);
                    
  // Insurance
  const hasInsurance = document.getElementById('checkout-insurance').checked;
  const insuranceFee = hasInsurance ? (49 * checkoutGuests) : 0;
  
  // Subtotal before taxes & fees
  const subtotal = baseTotal;
  
  const taxesFees = Math.round(subtotal * 0.12);
  const serviceFee = Math.round(subtotal * 0.05);
  
  // Promo Discount
  let discount = 0;
  if (promoApplied) {
    const code = document.getElementById('checkout-promo').value.trim().toUpperCase();
    if (code === 'VOYARA15') {
      discount = Math.round(subtotal * 0.15);
    } else if (code === 'WELCOME') {
      discount = 50;
    }
  }
  
  const grandTotal = subtotal + taxesFees + serviceFee + insuranceFee - discount;
  
  // Update sidebar UI
  document.getElementById('calc-base-price').textContent = `$${baseTotal.toLocaleString()}`;
  document.getElementById('calc-taxes-fees').textContent = `$${taxesFees.toLocaleString()}`;
  document.getElementById('calc-service-fee').textContent = `$${serviceFee.toLocaleString()}`;
  
  const insuranceEl = document.getElementById('summary-insurance-fee');
  insuranceEl.textContent = hasInsurance ? `$${insuranceFee} ($49 per guest)` : 'Not included';
  
  const discountRow = document.getElementById('calc-discount-row');
  if (discount > 0) {
    discountRow.style.display = 'flex';
    document.getElementById('calc-discount-price').textContent = `-$${discount.toLocaleString()}`;
  } else {
    discountRow.style.display = 'none';
  }
  
  document.getElementById('calc-grand-total').textContent = `$${grandTotal.toLocaleString()}`;
  
  // Store computed values in checkout state
  window.checkoutState = {
    baseTotal,
    taxesFees,
    serviceFee,
    insuranceFee,
    discount,
    grandTotal,
    nights,
    guests: checkoutGuests
  };
};

function setStepperStep(step) {
  // Update progress bar UI
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById(`stepper-step-${i}`);
    const flow = document.getElementById(`checkout-flow-${i}`);
    if (i === step) {
      el.classList.add('active');
      flow.style.display = 'block';
    } else {
      el.classList.remove('active');
      flow.style.display = 'none';
    }
  }
}

window.goToCheckoutPayment = function() {
  setStepperStep(2);
  
  // Check browser user agents for Apple Pay / Google Pay button displays
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isMacOriOS = /Macintosh|iPhone|iPad|iPod/i.test(navigator.platform);
  
  const appleBtn = document.getElementById('btn-apple-pay');
  const googleBtn = document.getElementById('btn-google-pay');
  
  if (isSafari || isMacOriOS) {
    appleBtn.style.display = 'flex';
    googleBtn.style.display = 'none';
  } else {
    appleBtn.style.display = 'none';
    googleBtn.style.display = 'flex';
  }
  
  // Fill in email from active session if logged in
  const ccEmail = document.getElementById('cc-email');
  if (ccEmail && ccEmail.value === '') {
    const activeSummary = document.getElementById('user-profile-summary');
    if (activeSummary && activeSummary.textContent && activeSummary.textContent.includes('@')) {
      ccEmail.value = activeSummary.textContent.trim();
    }
  }
};

window.goToCheckoutReview = function() {
  setStepperStep(1);
};

window.formatCardNumber = function(input) {
  // Remove all non-digits
  let value = input.value.replace(/\D/g, '');
  // Auto-group into blocks of 4 digits
  let formatted = value.match(/.{1,4}/g)?.join(' ') || value;
  input.value = formatted;
  
  // Card brand detection using prefix patterns
  const logo = document.getElementById('cc-brand-logo');
  if (value.startsWith('4')) {
    logo.textContent = 'Visa 💳';
    logo.style.color = '#150485';
  } else if (/^(5[1-5]|2[2-7])/.test(value)) {
    logo.textContent = 'Mastercard 💳';
    logo.style.color = '#ff5f00';
  } else if (/^3[47]/.test(value)) {
    logo.textContent = 'Amex 💳';
    logo.style.color = '#0070cd';
  } else if (/^(6011|65)/.test(value)) {
    logo.textContent = 'Discover 💳';
    logo.style.color = '#f9a825';
  } else {
    logo.textContent = '';
  }
};

window.formatCardExpiry = function(input) {
  let value = input.value.replace(/\D/g, '');
  if (value.length > 2) {
    input.value = value.substring(0, 2) + '/' + value.substring(2, 4);
  } else {
    input.value = value;
  }
};

window.processCardPayment = async function(event) {
  event.preventDefault();
  
  const ccNumber = document.getElementById('cc-number').value.replace(/\s/g, '');
  const ccExpiry = document.getElementById('cc-expiry').value;
  const ccCvv = document.getElementById('cc-cvv').value;
  const ccName = document.getElementById('cc-name').value;
  const alertEl = document.getElementById('card-validation-alert');
  
  // Basic validation check
  if (ccNumber.length < 15 || ccNumber.length > 16) {
    alertEl.textContent = '⚠️ Please enter a valid 15 or 16-digit card number.';
    alertEl.style.display = 'block';
    return;
  }
  if (!/^\d{2}\/\d{2}$/.test(ccExpiry)) {
    alertEl.textContent = '⚠️ Expiry date must be in MM/YY format.';
    alertEl.style.display = 'block';
    return;
  }
  if (ccCvv.length < 3 || ccCvv.length > 4) {
    alertEl.textContent = '⚠️ CVV must be 3 or 4 digits.';
    alertEl.style.display = 'block';
    return;
  }
  alertEl.style.display = 'none';
  
  // Prepare dynamic loading overlay
  const originalContent = document.getElementById('checkout-flow-2').innerHTML;
  const mainContentContainer = document.getElementById('checkout-flow-2');
  
  mainContentContainer.innerHTML = `
    <div style="text-align: center; padding: 4rem 0;">
      <div class="typing-indicator" style="margin: 0 auto 1.5rem; justify-content: center;">
        <div class="typing-dot" style="background-color: var(--color-primary);"></div>
        <div class="typing-dot" style="background-color: var(--color-primary);"></div>
        <div class="typing-dot" style="background-color: var(--color-primary);"></div>
      </div>
      <h3>Securely Processing Transaction...</h3>
      <p style="color: var(--color-text-muted); font-size: 0.9rem; margin-top: 0.5rem;">Authenticating payment with Stripe (3D Secure)...</p>
    </div>
  `;
  
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: window.checkoutState.grandTotal,
        paymentMethodType: 'card',
        ccName,
        ccEmail: document.getElementById('cc-email').value
      })
    });
    
    if (!res.ok) throw new Error('Payment processing failed');
    const data = await res.json();
    
    // Simulate slight authorization lag for premium realism
    setTimeout(() => {
      completeBookingSuccess();
    }, 1500);
    
  } catch (err) {
    console.error('Payment API Error:', err);
    mainContentContainer.innerHTML = originalContent; // Restore form
    const newAlert = document.getElementById('card-validation-alert');
    if (newAlert) {
      newAlert.textContent = '❌ Payment authorization failed. Please verify credentials or retry.';
      newAlert.style.display = 'block';
    }
  }
};

window.triggerApplePay = function() {
  const grandTotal = window.checkoutState.grandTotal;
  
  if (window.PaymentRequest) {
    const methodData = [{
      supportedMethods: 'https://apple.com/apple-pay',
      data: {
        version: 3,
        merchantIdentifier: 'merchant.voyara.travel',
        merchantCapabilities: ['supports3DS'],
        supportedNetworks: ['visa', 'mastercard', 'amex'],
        countryCode: 'US',
        primaryPaymentMethodType: 'card'
      }
    }];
    
    const details = {
      total: {
        label: 'Voyara Vacation Package',
        amount: { currency: 'USD', value: grandTotal.toString() }
      }
    };
    
    const request = new PaymentRequest(methodData, details);
    request.show().then(response => {
      response.complete('success').then(() => {
        completeBookingSuccess();
      });
    }).catch(err => {
      console.warn('Apple Pay Sheet cancelled or failed, running demo fallback:', err);
      runDemoWalletSheet('Apple Pay');
    });
  } else {
    runDemoWalletSheet('Apple Pay');
  }
};

window.triggerGooglePay = function() {
  const grandTotal = window.checkoutState.grandTotal;
  
  if (window.PaymentRequest) {
    const methodData = [{
      supportedMethods: 'https://google.com/pay',
      data: {
        environment: 'TEST',
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [{
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX']
          }
        }]
      }
    }];
    
    const details = {
      total: {
        label: 'Voyara Vacation Package',
        amount: { currency: 'USD', value: grandTotal.toString() }
      }
    };
    
    const request = new PaymentRequest(methodData, details);
    request.show().then(response => {
      response.complete('success').then(() => {
        completeBookingSuccess();
      });
    }).catch(err => {
      console.warn('Google Pay Sheet cancelled or failed, running demo fallback:', err);
      runDemoWalletSheet('Google Pay');
    });
  } else {
    runDemoWalletSheet('Google Pay');
  }
};

function runDemoWalletSheet(walletType) {
  // Show premium wallet sheet modal simulation
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.right = '0';
  overlay.style.bottom = '0';
  overlay.style.background = 'rgba(0,0,0,0.85)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '99999';
  overlay.style.backdropFilter = 'blur(10px)';
  
  const sheet = document.createElement('div');
  sheet.style.background = 'var(--bg-card)';
  sheet.style.border = '1px solid var(--border-color)';
  sheet.style.borderRadius = 'var(--radius-md)';
  sheet.style.padding = '2.5rem';
  sheet.style.maxWidth = '400px';
  sheet.style.width = '95%';
  sheet.style.textAlign = 'center';
  sheet.style.boxShadow = '0 20px 50px rgba(0,0,0,0.5)';
  
  sheet.innerHTML = `
    <h3 style="margin-bottom: 0.5rem; color: var(--color-text-primary); font-size:1.3rem;">${walletType} Authentication</h3>
    <p style="color:var(--color-text-secondary); font-size:0.85rem; margin-bottom: 2rem;">Authorized merchant: Voyara Travel Co-Pilot</p>
    
    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding:1rem; text-align: left; margin-bottom: 2rem;">
      <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem;">
        <span style="color:var(--color-text-muted); font-size:0.8rem;">Item</span>
        <span style="font-weight:bold; color:var(--color-text-primary); font-size:0.85rem;">Vacation Itinerary</span>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <span style="color:var(--color-text-muted); font-size:0.8rem;">Grand Total</span>
        <span style="font-weight:bold; color:var(--color-secondary); font-size:1.05rem;">$${window.checkoutState.grandTotal.toLocaleString()}</span>
      </div>
    </div>
    
    <div style="margin-bottom: 2rem; display: flex; justify-content: center;">
      <div class="success-icon-wrapper" style="width: 50px; height: 50px; border-radius: 50%; border: 2.5px solid var(--color-primary); display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 1.25rem; font-weight: bold; color: var(--color-primary);">Touch</span>
      </div>
    </div>
    
    <p style="color:var(--color-text-muted); font-size: 0.8rem; margin-bottom: 1.5rem;">Confirming via Biometrics (Face ID / Touch ID)...</p>
    <button type="button" class="btn-wizard-nav next" style="width:100%;" onclick="this.parentElement.parentElement.remove(); window.completeBookingSuccess();">Authorize and Pay</button>
  `;
  
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
}

window.completeBookingSuccess = async function() {
  setStepperStep(3);
  
  // Generate random reference code
  const refCode = 'ATH-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(10 + Math.random() * 89);
  document.getElementById('ticket-booking-ref').textContent = refCode;
  
  // Set voucher elements
  document.getElementById('ticket-dest-name').textContent = state.itinerary.destination.name;
  document.getElementById('ticket-guests-count').textContent = `${window.checkoutState.guests} Traveler${window.checkoutState.guests > 1 ? 's' : ''}`;
  
  const startD = document.getElementById('checkout-start-date').value;
  const endD = document.getElementById('checkout-end-date').value;
  document.getElementById('ticket-travel-dates').textContent = `${startD} to ${endD}`;
  
  // Sync booking details to Supabase table
  if (supabaseClient) {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const payload = {
        booking_reference: refCode,
        user_id: session ? session.user.id : null,
        itinerary_data: {
          destination: state.itinerary.destination,
          flight: state.itinerary.flight,
          hotel: state.itinerary.hotel,
          activities: state.itinerary.activities,
          dates: { start: startD, end: endD },
        },
        total_price: window.checkoutState.grandTotal
      };
      
      const { error } = await supabaseClient
        .from('bookings')
        .insert(payload);
        
      if (error) {
        console.warn('Booking sync failed (bookings table might not exist in sandbox DB):', error.message);
      } else {
        console.log('Booking successfully written to Supabase!');
      }
    } catch (err) {
      console.error('Supabase booking sync error:', err);
    }
  }
};

window.downloadPDFItinerary = function() {
  alert('Preparing PDF Itinerary generation... Initializing document layout.');
  window.print();
};

window.downloadInvoice = function() {
  const content = `
    VOYARA TRAVEL CO-PILOT
    INVOICE RECEIPT
    =========================
    Booking Reference: ${document.getElementById('ticket-booking-ref').textContent}
    Destination: ${state.itinerary.destination.name}
    Travelers: ${window.checkoutState.guests}
    Nights: ${window.checkoutState.nights}
    
    Base Total: $${window.checkoutState.baseTotal.toLocaleString()}
    Taxes & Fees: $${window.checkoutState.taxesFees.toLocaleString()}
    Service Charge: $${window.checkoutState.serviceFee.toLocaleString()}
    Discounts: -$${window.checkoutState.discount.toLocaleString()}
    
    GRAND TOTAL PAID: $${window.checkoutState.grandTotal.toLocaleString()}
    Payment Status: APPROVED via Secure Gateway
  `;
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Invoice-${document.getElementById('ticket-booking-ref').textContent}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

window.shareTripDetails = function() {
  const shareText = `I just booked a premium travel getaway to ${state.itinerary.destination.name} with Voyara Travel Co-Pilot! Reference: ${document.getElementById('ticket-booking-ref').textContent}`;
  if (navigator.share) {
    navigator.share({
      title: 'My Voyara Travel Itinerary',
      text: shareText,
      url: window.location.origin
    }).catch(err => console.log(err));
  } else {
    navigator.clipboard.writeText(shareText);
    alert('Voucher share details copied to clipboard!');
  }
};

window.returnToDashboard = function() {
  // Clear planner state
  state.itinerary = {
    destination: null,
    flight: null,
    hotel: null,
    activities: []
  };
  renderPlannerView();
  navigateToView('dashboard');
};

window.showUpdatePasswordPanel = function() {
  document.getElementById('auth-panel-signin').style.display = 'none';
  document.getElementById('auth-panel-signup').style.display = 'none';
  document.getElementById('auth-panel-forgot').style.display = 'none';
  document.getElementById('auth-panel-update').style.display = 'block';
  document.getElementById('social-auth-block').style.display = 'none';
  document.getElementById('auth-tabs-row').style.display = 'none';
};

window.handleUpdatePasswordSubmit = async function(event) {
  event.preventDefault();
  const password = document.getElementById('update-password').value;
  const errEl = document.getElementById('update-error');
  const submitBtn = document.getElementById('btn-update-submit');
  
  errEl.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.firstElementChild.textContent = 'Updating password...';
  
  try {
    if (!supabaseClient) throw new Error('Supabase Client not initialized.');
    const { data, error } = await supabaseClient.auth.updateUser({ password });
    if (error) throw error;
    
    window.showToast('Password updated successfully! Please sign in.', 'success');
    // Hide update panel and restore tabs
    document.getElementById('auth-panel-update').style.display = 'none';
    document.getElementById('social-auth-block').style.display = 'block';
    document.getElementById('auth-tabs-row').style.display = 'flex';
    window.toggleAuthTab('signin');
  } catch (err) {
    console.error(err);
    errEl.textContent = `❌ ${err.message}`;
    errEl.style.display = 'block';
    window.showToast('Password update failed', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.firstElementChild.textContent = 'Update Password';
  }
};

window.addTripToCalendar = function() {
  const destName = state.itinerary.destination ? state.itinerary.destination.name : 'Luxury Vacation';
  const startD = document.getElementById('checkout-start-date').value || new Date().toISOString().split('T')[0];
  const endD = document.getElementById('checkout-end-date').value || new Date().toISOString().split('T')[0];
  const refCode = document.getElementById('ticket-booking-ref').textContent || 'ATH-VOUCHER';
  
  // Format date for ICS
  const formatICSDate = (dateStr) => {
    return dateStr.replace(/-/g, '') + 'T090000Z';
  };
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Voyara Travel Co-Pilot//EN',
    'BEGIN:VEVENT',
    `UID:${refCode}@voyaratravel.com`,
    `DTSTAMP:${formatICSDate(startD)}`,
    `DTSTART:${formatICSDate(startD)}`,
    `DTEND:${formatICSDate(endD)}`,
    `SUMMARY:Trip to ${destName} (Voyara Booking)`,
    `DESCRIPTION:Your luxury trip to ${destName}. Booking Ref: ${refCode}. Enjoy your premium travel co-pilot experience!`,
    `LOCATION:${destName}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Voyara-Trip-${refCode}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  window.showToast("Trip calendar file downloaded! Open it to add to Apple or Google Calendar.", "success");
};

// Toggle Favorite State on Destination Detail Hero
window.toggleFavoriteDestination = function(destId) {
  state.favorites = state.favorites || [];
  const idx = state.favorites.indexOf(destId);
  
  // Find button element
  const favBtn = document.querySelector('.btn-favorite-circle');
  
  if (idx > -1) {
    state.favorites.splice(idx, 1);
    window.showToast("Removed from favorites", "info");
    if (favBtn) favBtn.classList.remove('active');
  } else {
    state.favorites.push(destId);
    window.showToast("Added to favorites ❤️", "success");
    if (favBtn) favBtn.classList.add('active');
  }
};

// Adjust duration Days count dynamically
window.adjustDetailDuration = function(val) {
  state.itinerary.durationDays = state.itinerary.durationDays || 7;
  let newDays = state.itinerary.durationDays + val;
  if (newDays < 1) newDays = 1;
  if (newDays > 30) newDays = 30;
  
  state.itinerary.durationDays = newDays;
  
  // Update displayed number badge
  const displayBadge = document.getElementById('duration-display-badge');
  if (displayBadge) {
    displayBadge.textContent = `${newDays} Day${newDays > 1 ? 's' : ''}`;
  }
  
  // Recalculate and update suggested itinerary schedule nodes dynamically
  window.updateItineraryDays(newDays);
  
  // Recalculate price summaries and lists
  if (state.selectedDestination) {
    renderHotelsList(state.selectedDestination.hotels || []);
    renderFlightsList(state.selectedDestination.flights || []);
  }
};

window.showPremiumMapDetails = function(destId) {
  navigateToView('detail');
  
  setTimeout(() => {
    const detailSection = document.getElementById('map-container');
    if (detailSection) {
      detailSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    if (activeMap) {
      const center = activeMap.getCenter();
      const lat = center.lat;
      const lon = center.lng;
      
      const points = [
        { type: '🏨 Hotel', name: 'Voyara Grand Sovereign', offset: [0.005, -0.003], desc: 'Luxury Kyoto Stay (1.2 km from Center)' },
        { type: '✈️ Airport', name: 'Kyoto International Airport Terminal', offset: [0.035, 0.045], desc: 'Main Terminal (45 mins drive)' },
        { type: '🍜 Restaurant', name: 'Gion Ramen Kaji', offset: [-0.004, 0.008], desc: 'Michelin Starred (5 mins walk)' },
        { type: '🎨 Museum', name: 'Kyoto National Museum', offset: [-0.012, -0.006], desc: 'Classical Art (12 mins walk)' },
        { type: '⛩️ Temple', name: 'Kinkaku-ji (Golden Pavilion)', offset: [0.015, -0.018], desc: 'Historic temple complex' },
        { type: '🚉 Train Station', name: 'Kyoto Central Station', offset: [-0.015, 0.002], desc: 'Shinkansen bullet train hub' }
      ];
      
      points.forEach(p => {
        const pLat = lat + p.offset[0];
        const pLon = lon + p.offset[1];
        L.marker([pLat, pLon]).addTo(activeMap)
          .bindPopup(`<b>${p.type}: ${p.name}</b><br>${p.desc}`);
      });
      
      activeMap.setZoom(12);
      window.showToast("Premium destination points plotted on map!", "success");
    }
  }, 600);
};

window.toggleSectionCollapse = function(contentId, chevronId) {
  const content = document.getElementById(contentId);
  const chevron = document.getElementById(chevronId);
  const headerBtn = chevron ? chevron.closest('.options-section-header') : null;
  
  if (content) {
    const isCollapsed = content.classList.toggle('collapsed');
    if (headerBtn) {
      headerBtn.setAttribute('aria-expanded', !isCollapsed);
    }
    if (chevron) {
      if (isCollapsed) {
        chevron.classList.add('collapsed');
      } else {
        chevron.classList.remove('collapsed');
      }
    }
  }
};


// Sync Itinerary array size to dynamic duration count
window.updateItineraryDays = function(newDays) {
  if (!state.itinerary.destination) return;
  
  const currentActivities = state.itinerary.activities || [];
  if (currentActivities.length < newDays) {
    for (let d = currentActivities.length + 1; d <= newDays; d++) {
      state.itinerary.activities.push({
        day: d,
        time: '10:00 AM',
        title: `Explore attractions on Day ${d}`,
        description: `AI Co-Pilot recommends sightseeing and cultural discoveries in ${state.itinerary.destination.name}.`,
        price: 50
      });
    }
  } else if (currentActivities.length > newDays) {
    state.itinerary.activities = currentActivities.slice(0, newDays);
  }
  
  window.recalculateBudget();
  renderPlannerView();
};

// Dialog details modal open & close helpers
window.openHotelModal = function(hotelId) {
  if (!state.selectedDestination || !state.selectedDestination.hotels) return;
  const hotel = state.selectedDestination.hotels.find(h => h.id === hotelId);
  if (!hotel) return;
  
  window.hotelModalTrigger = document.activeElement;
  
  const dialog = document.getElementById('hotel-details-modal');
  if (!dialog) return;
  
  const dest = state.selectedDestination;
  const days = state.itinerary.durationDays || 7;
  const nights = days - 1 || 1;
  const rate = parseFloat(hotel.pricePerNight || hotel.price || 0);
  const estTotal = rate * nights;
  
  const images = [
    hotel.image,
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=600&auto=format&fit=crop'
  ];
  
  dialog.innerHTML = `
    <div class="hotel-modal-content">
      <button class="btn-modal-close" onclick="window.closeHotelModal()" aria-label="Close modal">×</button>
      
      <div class="hotel-modal-grid">
        <!-- Gallery / Carousel Column -->
        <div class="modal-gallery-column">
          <div class="gallery-hero-wrapper">
            <img id="gallery-hero-img" src="${images[0]}" alt="${hotel.name} View">
          </div>
          <div class="gallery-thumbs-row">
            ${images.map((img, idx) => `
              <button class="thumb-btn ${idx === 0 ? 'active' : ''}" onclick="window.switchModalGalleryImg(${idx}, ${JSON.stringify(images)})" aria-label="View photo ${idx + 1}">
                <img src="${img}" alt="Thumbnail ${idx + 1}" loading="lazy">
              </button>
            `).join('')}
          </div>
        </div>
        
        <!-- Info Column -->
        <div class="modal-info-column">
          <div class="modal-header-section">
            <span class="stay-stars">${'★'.repeat(hotel.stars || 5)}</span>
            <h2 id="hotel-modal-title">${hotel.name}</h2>
            <p class="hotel-modal-subtitle">${hotel.location || 'Central District'} • ${hotel.distance || '1.2 km from center'}</p>
          </div>
          
          <div class="modal-section">
            <h4>Description</h4>
            <p>${hotel.description || 'Experience hospitality at its finest in this elegant property located in the heart of the city.'}</p>
          </div>
          
          <div class="modal-section">
            <h4>Amenities</h4>
            <div class="modal-amenities-grid">
              <span>🏊 Pool & Wellness Spa</span>
              <span>📶 Ultra Fast Free Wi-Fi</span>
              <span>🍳 Complimentary Breakfast</span>
              <span>🏋️ Fitness Center</span>
              <span>🍹 Clifftop Lounge Bar</span>
              <span>🚗 Valet Parking</span>
            </div>
          </div>
          
          <div class="modal-section">
            <h4>Location & Attractions</h4>
            <p><strong>Address:</strong> ${hotel.address || '101 Premium Avenue, Kyoto, Japan'}</p>
            <div id="modal-hotel-map" style="height: 200px; border-radius: 8px; margin-top: 0.75rem; border: 1px solid var(--border-color);"></div>
            <div class="attractions-checklist" style="margin-top: 0.75rem; font-size: 0.85rem; color: var(--color-text-secondary); display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <span>🚇 Metro Station: <strong>0.3 km</strong></span>
              <span>✈️ Airport (KIX): <strong>42 km</strong></span>
              <span>⛩️ Fushimi Inari Shrine: <strong>1.5 km</strong></span>
              <span>🎋 Arashiyama Bamboo Grove: <strong>3.2 km</strong></span>
            </div>
          </div>
          
          <div class="modal-section">
            <h4>Room Options</h4>
            <div class="modal-room-row">
              <div>
                <strong>Deluxe Double Room</strong>
                <p style="font-size:0.8rem; margin:0; color:var(--color-text-secondary);">King Bed • Garden View</p>
              </div>
              <span class="room-status green">Available</span>
            </div>
            <div class="modal-room-row" style="margin-top: 0.5rem;">
              <div>
                <strong>Executive Suite</strong>
                <p style="font-size:0.8rem; margin:0; color:var(--color-text-secondary);">Separate Living Area • Spa Access</p>
              </div>
              <span class="room-status red">Sold Out</span>
            </div>
          </div>
          
          <div class="modal-section">
            <h4>Policies</h4>
            <div style="font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.5;">
              <div>🕒 Check-in: <strong>15:00</strong> | Check-out: <strong>11:00</strong></div>
              <div>🛡️ Cancellation: <span style="color:var(--color-secondary); font-weight:600;">Free cancellation up to 24h before check-in</span></div>
            </div>
          </div>
          
          <div class="modal-footer-cta">
            <div class="price-box">
              <span class="rate">${formatCurrency(rate)} <span style="font-size:0.85rem; font-weight:400; color:var(--color-text-secondary);">/ night</span></span>
              <span class="total">${formatCurrency(rate)} × ${nights} nights = <strong>${formatCurrency(estTotal)}</strong> Est. Total</span>
            </div>
            <div style="display:flex; gap:0.75rem;">
              <button class="btn-planner-secondary" onclick="window.openHotelWebsite('${hotel.name}')" style="flex:1;">Visit Website</button>
              <button class="btn-planner-primary" onclick="window.selectHotelFromModal('${hotel.id}')" style="flex:1;">Book Now</button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  `;
  
  dialog.showModal();
  
  // Render map inside the details dialog view
  setTimeout(() => {
    const lat = hotel.latitude || dest.latitude || 35.6895;
    const lon = hotel.longitude || dest.longitude || 139.6917;
    
    const hotelMap = L.map('modal-hotel-map', {
      zoomControl: false,
      attributionControl: false
    }).setView([lat, lon], 14);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(hotelMap);
    
    const hotelMarker = L.marker([lat, lon]).addTo(hotelMap);
    hotelMarker.bindPopup(`<b>${hotel.name}</b>`).openPopup();
    
    L.circleMarker([lat + 0.005, lon - 0.003], { color: 'var(--color-primary)', radius: 5 }).addTo(hotelMap).bindPopup("Metro Station");
    L.circleMarker([lat - 0.004, lon + 0.006], { color: 'var(--color-secondary)', radius: 5 }).addTo(hotelMap).bindPopup("Fushimi Inari Shrine");
  }, 100);
  
  dialog.addEventListener('cancel', () => {
    window.closeHotelModal();
  });
};

window.closeHotelModal = function() {
  const dialog = document.getElementById('hotel-details-modal');
  if (dialog) {
    dialog.close();
  }
  if (window.hotelModalTrigger) {
    window.hotelModalTrigger.focus();
  }
};

window.switchModalGalleryImg = function(index, images) {
  const heroImg = document.getElementById('gallery-hero-img');
  if (heroImg) {
    heroImg.src = images[index];
  }
  document.querySelectorAll('.thumb-btn').forEach((btn, idx) => {
    if (idx === index) btn.classList.add('active');
    else btn.classList.remove('active');
  });
};

window.openHotelWebsite = function(hotelName) {
  window.open(`https://google.com/search?q=${encodeURIComponent(hotelName + " website")}`, '_blank');
};

window.selectHotelFromModal = function(hotelId) {
  window.selectHotel(hotelId);
  window.closeHotelModal();
  window.showToast("Hotel stay added to your planner itinerary!", "success");
};

// Scroll to Reviews helper
window.scrollToReviews = function() {
  const hotelSection = document.querySelector('.detail-hotels-card');
  if (hotelSection) {
    hotelSection.scrollIntoView({ behavior: 'smooth' });
    window.showToast("Scrolling to stays and reviews", "info");
  }
};

// Show Weather Info helper
window.showWeatherInfo = function() {
  window.showToast("Current conditions sourced via OpenWeather API", "info");
};


