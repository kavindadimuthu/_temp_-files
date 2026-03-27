# Getting started to Secure Your React App with Asgardeo — Sign-In & Self Sign-Up Made Simple

**"Why spend weeks building authentication from scratch when you can have enterprise-grade security in minutes?"**

As React developers, we've all been there — staring at a blank component wondering how to implement secure user authentication without compromising on user experience or security best practices. Building auth from scratch means dealing with password hashing, session management, OAuth flows, security vulnerabilities, and countless edge cases.

**Enter Asgardeo** — Asgardeo is the identity and access management solution that transforms this complexity into a few simple React components.

Here are the steps we will follow in this guide to securing a React app with Asgardeo,

-Set up Asgardeo account
-Create an React application
-Integrate Asgardeo SDK with React app
-Run the application

Dress the suit, let's dive in!

## 1. Set up Asgardeo account (5 minutes)

### Step 1: Create Your Free Asgardeo Account
1. Head over to [Asgardeo Console](https://console.asgardeo.io/) & Sign up for a free account
2. Then sign in to the Asgardeo console 

### Step 2: Register Your React Application
1. In the Asgardeo Console, navigate to **Applications**
2. Click **+ New Application**
3. Choose **Single Page Application(SPA)** (perfect for React)
4. Configure your app:
   ```
   Example
    Name: asgardeo-react
    Authorized redirect URL: http://localhost:5173
   ```

### Step 3: Grab Your Credentials
After creating the application, you can see application configurations in quick start tab:
- **Client ID**
- **Base URL** 

Copy them as these are needed to add in react application


## 2. Create React application

If you don't have a React application set up yet, you can create one quickly using Vite. Run the following commands in your terminal:
```bash
npm create vite@latest asgardeo-react -- --template react
cd asgardeo-react
npm install
```

Then check if the application runs successfully:
```bash
npm run dev
```

Continue to the next step to integrate Asgardeo SDK into your React app.


## 3. Integrate Asgardeo SDK with React app (10 minutes)
### Step 1: Install Asgardeo React SDK
In your React project directory, install the Asgardeo React SDK via npm:
```bash
npm install @asgardeo/react
```

### Step 2: Wrap Your App with AsgardeoProvider
Open `src/main.jsx` and wrap your application with the `AsgardeoProvider`.jsx component, providing your Asgardeo configurations:
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AsgardeoProvider } from '@asgardeo/react';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AsgardeoProvider
      clientId="<your-app-client-id>"
      baseUrl="https://api.asgardeo.io/t/<your-organization-name>"
      signInRedirectURL="http://localhost:5173"
    >
      <App />
    </AsgardeoProvider>
  </React.StrictMode>,
);
```

### Step 3: Implement Sign-In and Sign-Out functionalities
Now, you can use the SignInButton, SignOutButton components to handle user sign-in and sign-out. Also you can use these components along side SignedIn and SignedOut components to conditionally render content based on the user's logged in state.
Here's an example of how to implement these in `src/App.jsx`:
```jsx
import React from 'react';
import { SignInButton, SignOutButton, SignedIn, SignedOut } from '@asgardeo/react';
import './App.css';

function App() {
  return (
    <div className="App">
      <h1>Welcome to Asgardeo React App</h1>

      <!-- Show Sign In button when user is signed out -->
      <SignedOut>
        <SignInButton>Sign In</SignInButton>
      </SignedOut>

      <!-- Show Sign Out button when user is signed in -->
      <SignedIn>
        <h2>You are signed in!</h2>
        <SignOutButton>Sign Out</SignOutButton>
      </SignedIn>
    </div>
  );
}

export default App;
```

### Step 4: Display signed-in user's profile information
You can also fetch and display the signed-in user's profile information using User, UserProfile, or UserDropdown components. Here's an example of how to display the user's profile using the UserDropdown component in `src/App.jsx`:
```jsx
import React from 'react';
import { SignInButton, SignOutButton, SignedIn, SignedOut, UserDropdown } from '@asgardeo/react';
import './App.css';

function App() {
  return (
    <div className="App">
      <h1>Welcome to Asgardeo React App</h1>

      <!-- Show Sign In button when user is signed out -->
      <SignedOut>
        <SignInButton>Sign In</SignInButton>
      </SignedOut>

      <!-- Show Sign Out button and user profile when user is signed in -->
      <SignedIn>
        <h2>You are signed in!</h2>
        <UserDropdown />
        <SignOutButton>Sign Out</SignOutButton>
      </SignedIn>
    </div>
  );
}

export default App;
```
Also you can use User and UserProfile components to fetch and display user profile information as per your requirement. Refer to the [Asgardeo React SDK documentation](https://asgardeo.io/docs/sdk/react-sdk/getting-started) for more details.

### Step 5: Add Self Sign-Up functionality
To enable self sign-up functionality, you can use the SignUpButton component provided by the Asgardeo React SDK. Here's an example of how to implement the Sign-Up button in `src/App.jsx`:
```jsx
import React from 'react';
import { SignInButton, SignOutButton, SignedIn, SignedOut, SignUpButton, UserDropdown } from '@asgardeo/react';
import './App.css';

function App() {
  return (
    <div className="App">
      <h1>Welcome to Asgardeo React App</h1>

      <!-- Show Sign In and Sign Up buttons when user is signed out -->
      <SignedOut>
        <SignInButton>Sign In</SignInButton>
        <SignUpButton>Sign Up</SignUpButton>
      </SignedOut>

      <!-- Show Sign Out button and user profile when user is signed in -->
      <SignedIn>
        <h2>You are signed in!</h2>
        <UserDropdown />
        <SignOutButton>Sign Out</SignOutButton>
      </SignedIn>
    </div>
  );
}

export default App;
```

## 4. Run the application
Finally, start your React application to see Asgardeo authentication in action:
```bash
npm run dev
```

## 🎉 Congratulations! You have successfully integrated Asgardeo authentication into your React application. You can now sign in, sign up, and manage user sessions with ease.

## Why Asgardeo + React = Developer Paradise

- 🎯 **Zero Security Debt**
- ⚡ **Lightning Fast Setup**  
- 🔒 **Security by Default**
- 📈 **Scales With Your Growth**

### 🛠️ **Developer Experience**
```jsx
// This is all you need for authentication:
<SignInButton>Sign In</SignInButton>
<SignOutButton>Sign Out</SignOutButton>
<SignUpButton>Sign Up</SignUpButton>

// And this for user information:
<UserDropdown />
<UserProfile />
<User />
```

---

##  What's Next?

### 🚀 Level Up Your App
Ready to add more features?
- **Social Login**: Add Google, GitHub, Facebook sign-in options
- **Multi-Factor Auth**: Enable SMS or email-based 2FA
- **Advanced Scopes**: Request additional user permissions
- **Organization Management**: Multi-tenant applications

### 🔗 Helpful Resources
- [Asgardeo React SDK Documentation](https://github.com/asgardeo/asgardeo-react)
- [Asgardeo Console](https://console.asgardeo.io/) — Manage your applications
- [OpenID Connect Explained](https://openid.net/connect/) — Understand the standard

---

**Found this helpful?** Drop a comment below with your experience or questions. I'd love to hear how you're using Asgardeo in your React applications!

*Happy coding! 🎉*
