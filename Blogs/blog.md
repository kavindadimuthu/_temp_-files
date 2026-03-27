# Getting started to Secure Your React App with Asgardeo — Sign-In & Self Sign-Up Made Simple

**"Why spend weeks building authentication from scratch when you can have enterprise-grade security in minutes?"**

As React developers, we've all been there — staring at a blank component wondering how to implement secure user authentication without compromising on user experience or security best practices. Building auth from scratch means dealing with password hashing, session management, OAuth flows, security vulnerabilities, and countless edge cases.

**Enter Asgardeo** — the identity and access management solution that transforms this complexity into a few simple React components.

In this guide, we'll secure your React app with Asgardeo in four simple steps:

1. Set up Asgardeo account
2. Create a React application  
3. Integrate Asgardeo SDK with React app
4. Run the application

Let's dive in!

## 1. Set Up Asgardeo Account (5 minutes)

### Step 1: Create Your Free Asgardeo Account
1. Head over to [Asgardeo Console](https://console.asgardeo.io/) & Sign up for a free account
2. Then sign in to the Asgardeo console 

### Step 2: Register Your React Application
1. In the Asgardeo Console, navigate to **Applications**
2. Click **+ New Application**
3. Choose **Single Page Application(SPA)** (perfect for React)
4. Configure your app:
   ```
   Name: asgardeo-react
   Authorized redirect URLs: http://localhost:5173
   ```

### Step 3: Grab Your Credentials
After creating the application, you'll find the essential configurations in the **Quick Start** tab:
- **Client ID**
- **Base URL**

Copy these credentials — you'll need them for your React application integration.


## 2. Create React Application

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


## 3. Integrate Asgardeo SDK with React App (10 minutes)
### Step 1: Install Asgardeo React SDK
In your React project directory, install the Asgardeo React SDK via npm:
```bash
npm install @asgardeo/react
```

### Step 2: Wrap Your App with AsgardeoProvider
Open `src/main.jsx` and wrap your application with the `AsgardeoProvider` component, providing your Asgardeo configurations:
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AsgardeoProvider } from '@asgardeo/react';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AsgardeoProvider
      clientId="<your-app-client-id>"
      baseUrl="https://api.asgardeo.io/t/<your-organization-name>"
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

function App() {
  return (
    <div style={{height: "100vh", display: "flex", flexDirection: "column", gap: "150px", padding: "20px"}}>
        <header style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
            <div>Asgardeo React App</div>
            <div style={{display: "flex", gap: "10px", alignItems: "center"}}>
            {/* Show Sign In and Sign Up buttons when user is signed out */}
            <SignedOut>
                <SignInButton>Sign In</SignInButton>
            </SignedOut>
            {/* Show Sign Out button when user is signed in */}
            <SignedIn>
                <h2>You are signed in!</h2>
                <SignOutButton>Sign Out</SignOutButton>
            </SignedIn>
            </div>
        </header>
        <main>
      	    <h1>Welcome to Asgardeo React App</h1>
        </main>
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

function App() {
  return (
    <div style={{height: "100vh", display: "flex", flexDirection: "column", gap: "150px", padding: "20px"}}>
        <header style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
            <div>Asgardeo React App</div>
            <div style={{display: "flex", gap: "10px", alignItems: "center"}}>
            {/* Show Sign In and Sign Up buttons when user is signed out */}
            <SignedOut>
                <SignInButton>Sign In</SignInButton>
            </SignedOut>
            {/* Show Sign Out button when user is signed in */}
            <SignedIn>
                <h2>You are signed in!</h2>
                <UserDropdown />
                <SignOutButton>Sign Out</SignOutButton>
            </SignedIn>
            </div>
        </header>
        <main>
      	    <h1>Welcome to Asgardeo React App</h1>
        </main>
    </div>
  );
}

export default App;
```
You can also use `User` and `UserProfile` components to fetch and display user profile information as needed. Refer to the [Asgardeo React SDK documentation](https://asgardeo.io/docs/sdk/react-sdk/getting-started) for more details.

### Step 5: Add Self Sign-Up Functionality
Let users create their own accounts by adding the `SignUpButton` component. This enables self-service registration alongside your sign-in flow.

Update your `src/App.jsx` to include the Sign-Up button:
```jsx
import React from 'react';
import { SignInButton, SignOutButton, SignedIn, SignedOut, SignUpButton, UserDropdown } from '@asgardeo/react';

function App() {
  return (
    <div style={{height: "100vh", display: "flex", flexDirection: "column", gap: "150px", padding: "20px"}}>
        <header style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
            <div>Asgardeo React App</div>
            <div style={{display: "flex", gap: "10px", alignItems: "center"}}>
            {/* Show Sign In and Sign Up buttons when user is signed out */}
            <SignedOut>
                <SignInButton>Sign In</SignInButton>
                <SignUpButton>Sign Up</SignUpButton>
            </SignedOut>
            {/* Show Sign Out button when user is signed in */}
            <SignedIn>
                <h2>You are signed in!</h2>
                <UserDropdown />
                <SignOutButton>Sign Out</SignOutButton>
            </SignedIn>
            </div>
        </header>
        <main>
      	    <h1>Welcome to Asgardeo React App</h1>
        </main>
    </div>
  );
}

export default App;
```

## 4. Run the Application
Finally, start your React application to see Asgardeo authentication in action:
```bash
npm run dev
```

## 🎉 Congratulations!

You've successfully integrated enterprise-grade authentication into your React application! Your app now supports:
- ✅ **Secure Sign-In** with industry standards
- ✅ **Self Sign-Up** for user onboarding
- ✅ **Session Management** handled automatically
- ✅ **User Profile** data access

## Why Asgardeo + React = Developer Paradise

- 🎯 **Zero Security Debt**: No more worrying about password storage, session management, or security vulnerabilities
- ⚡ **Lightning Fast Setup**: From zero to authenticated in under 15 minutes  
- 🔒 **Security by Default**: Built-in protection against common attacks and compliance with industry standards
- 📈 **Scales With Your Growth**: From prototype to enterprise, Asgardeo grows with your application

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
- **Securing Routes**: Protect specific pages/components
- **Accessing protected APIs**: Call backend services with access tokens
- **Manage tokens in React**: Handle token related operations seamlessly

### 🔗 Helpful Resources
- [Asgardeo React Quick Start Guide](https://wso2.com/asgardeo/docs/quick-starts/react)
- [Asgardeo React Complete Guide](https://wso2.com/asgardeo/docs/complete-guides/react/introduction)
- [Asgardeo SDK Documentation](https://wso2.com/asgardeo/docs/sdks/)
- [Asgardeo Console](https://console.asgardeo.io/) — Manage your applications
- [OpenID Connect Explained](https://openid.net/connect/) — Understand the standard

---

**Found this helpful?** Drop a comment below with your experience or questions. I'd love to hear how you're using Asgardeo in your React applications!

*Happy coding! 🎉*
