# Feature: Authentication and Authorization

## Problem Statement

The application currently has no access control mechanism. All users can access all features and data without session identification. The system needs to distinguish between two types of users: **Admin** (who create/edit products and view all orders) and **OrderUser** (who place orders and view only their own orders). Two hardcoded users are configured at startup: Admin (password: "Admin") and OrderUser (password: "OrderUser"). Without authentication, there is no way to identify which user is accessing the system. Without authorization, there is no way to enforce role-based access control. This feature introduces login/logout, session management, and role-based access restrictions to core API endpoints and UI features.

## Proposed Change

### Authentication
- **Login page:** A public login form where users enter username and password (only hardcoded users accepted: "Admin" or "OrderUser")
- **Hardcoded users:** Two users are defined at application startup:
  - **Admin:** username "Admin", password "Admin"
  - **OrderUser:** username "OrderUser", password "OrderUser"
- **Session management:** On successful login, a session token (JWT) is issued and stored in a secure cookie
- **Logout:** Clear session token and redirect to login page
- **Protected routes:** All API endpoints require a valid session token; unauthenticated requests receive 401 Unauthorized

### Authorization
Two user roles with distinct permissions:

**Admin** (role: `admin`)
- Can view and manage products (create/edit/delete product, add/edit/delete properties and values)
- Can view all orders from all OrderUsers
- Can mark orders as completed/cancelled
- Cannot place orders

**OrderUser** (role: `orderuser`)
- Can place new orders
- Can view only their own orders (not others')
- Can cancel their own orders (if not already completed)
- Cannot access product management or view other users' orders

### UI Changes
- **Public pages:** Login page (username/password for Admin or OrderUser only)
- **Authenticated pages:** 
  - Products tab (Admin only, hidden for OrderUser)
  - Orders tab (All authenticated users; Admin sees all, OrderUser sees only theirs)
  - Reports tab (Admin only, hidden for OrderUser; aggregated order statistics and summaries)
  - Logout button (all authenticated users)
- **Redirects:** Unauthenticated users trying to access protected routes are redirected to login; users accessing role-restricted pages see 403 Forbidden

## Acceptance Criteria

### Authentication: Login

#### AC1: Login with valid Admin credentials
**Given** the login form is displayed  
**When** user enters username "Admin" and password "Admin" and clicks "Login"  
**Then** status 200 is returned; a session token (JWT) is issued with role "admin"; user is redirected to the home page; browser stores the token in a secure, httpOnly cookie named "session"

#### AC2: Login with valid OrderUser credentials
**Given** the login form is displayed  
**When** user enters username "OrderUser" and password "OrderUser" and clicks "Login"  
**Then** status 200 is returned; a session token (JWT) is issued with role "orderuser"; user is redirected to the home page; browser stores the token in a secure, httpOnly cookie named "session"

#### AC3: Login with invalid username
**Given** the login form is displayed  
**When** user enters username "InvalidUser" and password "InvalidPass" and clicks "Login"  
**Then** status 401 is returned; response is {error: "Invalid username or password"}; no token is issued; user remains on login page; password field is cleared

#### AC4: Login with incorrect password for Admin
**Given** the login form is displayed  
**When** user enters username "Admin" and password "WrongPassword" and clicks "Login"  
**Then** status 401 is returned; response is {error: "Invalid username or password"}; no token is issued; user remains on login page; password field is cleared

#### AC5: Login with incorrect password for OrderUser
**Given** the login form is displayed  
**When** user enters username "OrderUser" and password "WrongPassword" and clicks "Login"  
**Then** status 401 is returned; response is {error: "Invalid username or password"}; no token is issued; user remains on login page; password field is cleared

#### AC6: Login with empty username field
**Given** the login form is displayed  
**When** user leaves the username field blank, enters a password, and clicks "Login"  
**Then** no API call is made; a client-side validation error "Username is required" appears; form retains focus on username field

#### AC7: Login with empty password field
**Given** the login form is displayed  
**When** user enters a username, leaves the password field blank, and clicks "Login"  
**Then** no API call is made; a client-side validation error "Password is required" appears; form retains focus on password field

#### AC8: Session token expires after 24 hours
**Given** a user is logged in with a valid session token; token has a 24-hour expiration  
**When** 24 hours pass without user activity  
**Then** the token expires; next API request receives 401 Unauthorized; user is automatically logged out and redirected to login page

### Authentication: Logout

#### AC9: Logout clears session
**Given** a user is logged in with a valid session token  
**When** user clicks "Logout" button  
**Then** the session token is deleted from the server's session store (or blacklisted if using JWT); the httpOnly cookie is cleared; user is redirected to login page; subsequent API requests without token receive 401 Unauthorized

#### AC10: Logout button visible only when authenticated
**Given** a user is logged in  
**When** user views the navigation bar  
**Then** a "Logout" button is visible and clickable

#### AC11: Logout button hidden when not authenticated
**Given** user is on the login page (not authenticated)  
**When** user views the page  
**Then** no "Logout" button is visible

### Authorization: Product Management

#### AC12: Admin can view Products tab
**Given** a user with role "admin" is logged in  
**When** user navigates to the home page  
**Then** the "Products" tab is visible in the navigation; clicking it displays the product management UI

#### AC13: OrderUser cannot access Products tab
**Given** a user with role "orderuser" is logged in  
**When** user is on the home page  
**Then** the "Products" tab is not visible in the navigation; if user manually navigates to /products or calls GET /api/products, status 403 Forbidden is returned with {error: "Access denied: admin only"}

#### AC14: Unauthenticated user cannot access Products tab
**Given** no user is logged in  
**When** user tries to navigate to /products  
**Then** user is redirected to /login page

#### AC15: Admin can create product
**Given** an admin is logged in with valid session token  
**When** admin calls POST /api/products {name: "Chocolate Cake"}  
**Then** status 201 is returned; product is created

#### AC16: OrderUser cannot create product
**Given** an orderuser is logged in with valid session token  
**When** orderuser calls POST /api/products {name: "Chocolate Cake"}  
**Then** status 403 Forbidden is returned; response is {error: "Access denied: admin only"}; no product is created

#### AC17: Unauthenticated user cannot create product
**Given** no session token is provided (or token is invalid/expired)  
**When** user calls POST /api/products {name: "Chocolate Cake"}  
**Then** status 401 Unauthorized is returned; response is {error: "Unauthorized: valid session required"}; no product is created

#### AC18: Admin can delete product
**Given** an admin is logged in; product "cake1" exists with no orders  
**When** admin calls DELETE /api/products/cake1  
**Then** status 200 is returned; product is deleted

#### AC19: OrderUser cannot delete product
**Given** an orderuser is logged in; product "cake1" exists  
**When** orderuser calls DELETE /api/products/cake1  
**Then** status 403 Forbidden is returned; response is {error: "Access denied: admin only"}; product is not deleted

### Authorization: Reports

#### AC20: Admin can view Reports tab
**Given** a user with role "admin" is logged in  
**When** user navigates to the home page  
**Then** the "Reports" tab is visible in the navigation; clicking it displays the reports page with order statistics and summaries

#### AC21: OrderUser cannot access Reports tab
**Given** a user with role "orderuser" is logged in  
**When** user is on the home page  
**Then** the "Reports" tab is not visible in the navigation; if user manually navigates to /reports or calls GET /api/reports, status 403 Forbidden is returned with {error: "Access denied: admin only"}

#### AC22: Unauthenticated user cannot access Reports tab
**Given** no user is logged in  
**When** user tries to navigate to /reports  
**Then** user is redirected to /login page

#### AC23: Admin can fetch reports data
**Given** an admin is logged in with valid session token  
**When** admin calls GET /api/reports  
**Then** status 200 is returned; response contains order statistics (total orders, total revenue, orders by status, etc.)

#### AC24: OrderUser cannot fetch reports data
**Given** an orderuser is logged in with valid session token  
**When** orderuser calls GET /api/reports  
**Then** status 403 Forbidden is returned; response is {error: "Access denied: admin only"}; no data is returned

#### AC25: Unauthenticated user cannot fetch reports data
**Given** no session token is provided (or token is invalid/expired)  
**When** user calls GET /api/reports  
**Then** status 401 Unauthorized is returned; response is {error: "Unauthorized: valid session required"}; no data is returned

### Authorization: Orders

#### AC26: OrderUser can place order for themselves
**Given** an orderuser is logged in; orderuser id is "orderuser1"  
**When** orderuser calls POST /api/orders {items: [...]}, orderuser id is read from session token  
**Then** status 201 is returned; order is created with userId = "orderuser1"

#### AC27: Admin cannot place orders
**Given** an admin is logged in  
**When** admin calls POST /api/orders {items: [...]}  
**Then** status 403 Forbidden is returned; response is {error: "Access denied: orderuser only"}; no order is created

#### AC28: OrderUser cannot place order for another user
**Given** an orderuser with id "orderuser1" is logged in  
**When** orderuser calls POST /api/orders {userId: "orderuser2", items: [...]}  
**Then** status 201 is returned; order is created with userId = "orderuser1" (from token, userId field ignored)

#### AC29: OrderUser can view only their own orders
**Given** orderuser "orderuser1" is logged in; orderuser1 has orders ord1, ord2; orderuser2 has order ord3  
**When** orderuser1 calls GET /api/orders  
**Then** status 200 is returned; response contains only [ord1, ord2]; ord3 is not included

#### AC30: Admin can view all orders
**Given** an admin is logged in; orderuser1 has orders ord1, ord2; orderuser2 has order ord3  
**When** admin calls GET /api/orders  
**Then** status 200 is returned; response contains [ord1, ord2, ord3] from all orderusers

#### AC31: OrderUser cannot view another user's order
**Given** orderuser "orderuser1" is logged in; order "ord3" belongs to orderuser2  
**When** orderuser1 calls GET /api/orders/ord3  
**Then** status 403 Forbidden is returned; response is {error: "Access denied: this order belongs to another user"}; order details are not disclosed

#### AC32: Admin can view any user's order
**Given** an admin is logged in; order "ord3" belongs to orderuser2  
**When** admin calls GET /api/orders/ord3  
**Then** status 200 is returned; order details are returned

#### AC33: OrderUser can cancel their own order
**Given** orderuser1 has order "ord1" with status "pending"  
**When** orderuser1 calls PUT /api/orders/ord1 {status: "cancelled"}  
**Then** status 200 is returned; order status is updated to "cancelled"

#### AC34: OrderUser cannot cancel another user's order
**Given** orderuser1 is logged in; order "ord3" belongs to orderuser2 with status "pending"  
**When** orderuser1 calls PUT /api/orders/ord3 {status: "cancelled"}  
**Then** status 403 Forbidden is returned; response is {error: "Access denied: this order belongs to another user"}; order status remains unchanged

#### AC35: Admin can mark order as completed
**Given** an admin is logged in; order "ord1" has status "pending"  
**When** admin calls PUT /api/orders/ord1 {status: "completed"}  
**Then** status 200 is returned; order status is updated to "completed"

#### AC36: OrderUser cannot mark orders as completed
**Given** an orderuser is logged in  
**When** orderuser calls PUT /api/orders/ord1 {status: "completed"}  
**Then** status 403 Forbidden is returned; response is {error: "Access denied: admin only"}; order status remains unchanged

### Session and Token Management

#### AC37: Session token is valid for 24 hours
**Given** a user logs in at time T  
**When** the session token is issued  
**Then** the token includes an expiration time (exp claim in JWT) set to T + 24 hours (86400 seconds)

#### AC38: Token is stored in httpOnly secure cookie
**Given** a user logs in successfully  
**When** the server issues the session token  
**Then** the token is set in a cookie named "session" with flags: httpOnly=true, Secure=true (HTTPS only), SameSite=Strict; the token is not accessible via JavaScript (document.cookie does not return it)

#### AC39: Invalid token returns 401
**Given** a user calls an API endpoint with a token that is malformed, expired, or never signed by the server  
**When** the request is processed  
**Then** status 401 Unauthorized is returned; response is {error: "Unauthorized: valid session required"}

#### AC40: Missing token returns 401
**Given** a user makes an API request without providing a session token (no cookie, no Authorization header)  
**When** the request is processed  
**Then** status 401 Unauthorized is returned; response is {error: "Unauthorized: valid session required"}

### UI: Login and Logout

#### AC41: Login page accessible without authentication
**Given** no user is logged in  
**When** user navigates to /login  
**Then** login form is displayed; form has username input, password input, and "Login" button; no signup link shown (signup not available)

#### AC42: Logged-in user cannot access login page
**Given** a user is logged in  
**When** user navigates to /login  
**Then** user is automatically redirected to the home page (/)

### UI: Navigation and Role-Based Visibility

#### AC43: Admin sees all tabs
**Given** an admin is logged in  
**When** user views the navigation bar  
**Then** tabs visible are: "Products", "Orders", "Reports", "Logout"; username "Admin" is displayed

#### AC44: OrderUser sees limited tabs
**Given** an orderuser is logged in  
**When** user views the navigation bar  
**Then** tabs visible are: "Orders", "Logout"; "Products" and "Reports" tabs are not shown; username "OrderUser" is displayed

#### AC45: Unauthenticated user sees login link
**Given** no user is logged in  
**When** user views the page  
**Then** only "Login" link is visible in the navigation

## Files to Modify / Create

| File | Change |
|---|---|
| src/auth/users.js | Create hardcoded users module with two users: Admin (password: "Admin", role: "admin") and OrderUser (password: "OrderUser", role: "orderuser"); export function to validate credentials |
| src/auth/auth.js | Create authentication module: verifyCredentials (check against hardcoded users), issueToken (JWT), verifyToken, extractUserId and role from token |
| src/routes/auth.js | Create auth routes: POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me (current user info) |
| src/routes/products.js | Add authentication middleware to all endpoints; add admin-only authorization checks |
| src/routes/orders.js | Add authentication middleware to all endpoints; add orderuser/admin authorization checks; filter orders by userId for orderuser requests |
| src/routes/reports.js | Create reports routes: GET /api/reports (admin-only; returns order statistics and summaries) |
| src/middleware/authMiddleware.js | Create middleware: verifyToken (extract and validate token from cookie), requireAuth (return 401 if no valid token), requireRole (return 403 if user role doesn't match) |
| src/public/index.html | Add login page (/login); add navigation with conditional tabs based on user role (include Reports tab for admin); add username display; add logout button |
| src/public/app.js | Add login form handling, session token management, role-based UI rendering, logout handling, redirect logic for protected routes |
| src/public/reports.js | Add reports page logic: fetch reports data from /api/reports, display order statistics and summaries in charts/tables (admin only) |
| src/public/styles.css | Style login form, navigation bar, role-based visibility, username display, reports page and charts |
| src/public/auth.js | Create client-side auth helper: fetchWithAuth (auto-include token in requests), isAuthenticated, getCurrentUser, logout |

## Risk

- **What could break:** Token hijacking if stored insecurely; privilege escalation if authorization checks are incomplete or bypassed; orderusers seeing other users' orders if filtering is not enforced; credentials exposed if hardcoded users module is not protected
- **Mitigation:** 
  - Store tokens in httpOnly, Secure cookies (not localStorage or sessionStorage)
  - Add authorization middleware to ALL protected endpoints, not just a subset
  - Every order query must filter by userId for orderuser requests
  - Hardcoded user credentials should only be in the application (not in version control comments or logs)
  - Add audit logging for sensitive operations (login attempts, order access, cancellations)
- **Rollback:** Remove auth middleware from all routes; remove login page; remove navigation role checks; remove userId filtering on order queries; revert routes to public access

## Testing Strategy (MANDATORY)

| Function | Case | Given | When | Then |
|---|---|---|---|---|
| POST /api/auth/login | valid Admin login | login form displayed | POST {username: "Admin", password: "Admin"} | status 200, response {username: "Admin", role: "admin"}, session cookie set with JWT token, token expires in 24 hours |
| POST /api/auth/login | valid OrderUser login | login form displayed | POST {username: "OrderUser", password: "OrderUser"} | status 200, response {username: "OrderUser", role: "orderuser"}, session cookie set with JWT token, token expires in 24 hours |
| POST /api/auth/login | invalid username | login form displayed | POST {username: "InvalidUser", password: "InvalidPass"} | status 401, response {error: "Invalid username or password"}, no cookie set |
| POST /api/auth/login | wrong password for Admin | login form displayed | POST {username: "Admin", password: "WrongPassword"} | status 401, response {error: "Invalid username or password"}, password field cleared |
| POST /api/auth/login | wrong password for OrderUser | login form displayed | POST {username: "OrderUser", password: "WrongPassword"} | status 401, response {error: "Invalid username or password"}, password field cleared |
| POST /api/auth/login | empty username | login form displayed | POST {username: "", password: "Admin"} | no API call; client-side error "Username is required" |
| POST /api/auth/login | empty password | login form displayed | POST {username: "Admin", password: ""} | no API call; client-side error "Password is required" |
| POST /api/auth/login | missing username field | login form displayed | POST {password: "Admin"} | status 400, response {error: "Username is required"} |
| POST /api/auth/login | missing password field | login form displayed | POST {username: "Admin"} | status 400, response {error: "Password is required"} |
| POST /api/auth/logout | valid session | user logged in with valid token | POST /api/auth/logout | status 200, session cookie cleared, user redirected to /login, subsequent requests without new login receive 401 |
| GET /api/auth/me | Admin valid token | Admin logged in with valid session token | GET /api/auth/me with Admin cookie | status 200, response {username: "Admin", role: "admin"} |
| GET /api/auth/me | OrderUser valid token | OrderUser logged in with valid session token | GET /api/auth/me with OrderUser cookie | status 200, response {username: "OrderUser", role: "orderuser"} |
| GET /api/auth/me | missing token | no session token present | GET /api/auth/me without cookie | status 401, response {error: "Unauthorized: valid session required"} |
| GET /api/auth/me | expired token | token expired 24+ hours ago | GET /api/auth/me with expired cookie | status 401, response {error: "Unauthorized: valid session required"} |
| GET /api/auth/me | invalid token | malformed or unsigned token | GET /api/auth/me with invalid cookie | status 401, response {error: "Unauthorized: valid session required"} |
| GET /api/products | admin authenticated | admin logged in with valid token | GET /api/products with admin token | status 200, products list returned |
| GET /api/products | orderuser authenticated | orderuser logged in with valid token | GET /api/products with orderuser token | status 403, response {error: "Access denied: admin only"} |
| GET /api/products | unauthenticated | no session token | GET /api/products without token | status 401, response {error: "Unauthorized: valid session required"} |
| POST /api/products | admin authenticated | admin logged in | POST {name: "Cake"} with admin token | status 201, product created |
| POST /api/products | orderuser authenticated | orderuser logged in | POST {name: "Cake"} with orderuser token | status 403, response {error: "Access denied: admin only"} |
| POST /api/products | unauthenticated | no session token | POST {name: "Cake"} without token | status 401, response {error: "Unauthorized: valid session required"} |
| DELETE /api/products/:id | admin authenticated | admin logged in; product exists with no orders | DELETE /api/products/cake1 with admin token | status 200, product deleted |
| DELETE /api/products/:id | orderuser authenticated | orderuser logged in; product exists | DELETE /api/products/cake1 with orderuser token | status 403, response {error: "Access denied: admin only"} |
| DELETE /api/products/:id | unauthenticated | no session token | DELETE /api/products/cake1 without token | status 401, response {error: "Unauthorized: valid session required"} |
| GET /api/reports | admin authenticated | admin logged in with valid token | GET /api/reports with admin token | status 200, reports data returned with order statistics (total orders, by status, etc.) |
| GET /api/reports | orderuser authenticated | orderuser logged in with valid token | GET /api/reports with orderuser token | status 403, response {error: "Access denied: admin only"} |
| GET /api/reports | unauthenticated | no session token | GET /api/reports without token | status 401, response {error: "Unauthorized: valid session required"} |
| POST /api/orders | orderuser1 authenticated | orderuser1 logged in | POST {items: [...]} with orderuser1 token | status 201, order created with userId "orderuser1" from token |
| POST /api/orders | orderuser with explicit userId | orderuser1 logged in | POST {userId: "orderuser2", items: [...]} | status 201, order created with userId "orderuser1" (token takes precedence, field ignored) |
| POST /api/orders | admin authenticated | admin logged in | POST {items: [...]} with admin token | status 403, response {error: "Access denied: orderuser only"} |
| POST /api/orders | unauthenticated | no session token | POST {items: [...]} without token | status 401, response {error: "Unauthorized: valid session required"} |
| GET /api/orders | orderuser1 authenticated | orderuser1 logged in; orderuser1 has ord1, ord2; orderuser2 has ord3 | GET /api/orders with orderuser1 token | status 200, response [ord1, ord2] (only their own) |
| GET /api/orders | admin authenticated | admin logged in; orderuser1 has ord1, ord2; orderuser2 has ord3 | GET /api/orders with admin token | status 200, response [ord1, ord2, ord3] (all orders) |
| GET /api/orders | unauthenticated | no session token | GET /api/orders without token | status 401, response {error: "Unauthorized: valid session required"} |
| GET /api/orders/:id | orderuser owns order | orderuser1 logged in; ord1 belongs to orderuser1 | GET /api/orders/ord1 with orderuser1 token | status 200, order details returned |
| GET /api/orders/:id | orderuser views other's order | orderuser1 logged in; ord3 belongs to orderuser2 | GET /api/orders/ord3 with orderuser1 token | status 403, response {error: "Access denied: this order belongs to another user"} |
| GET /api/orders/:id | admin authenticated | admin logged in; ord3 belongs to orderuser2 | GET /api/orders/ord3 with admin token | status 200, order details returned |
| GET /api/orders/:id | unauthenticated | no session token | GET /api/orders/ord1 without token | status 401, response {error: "Unauthorized: valid session required"} |
| PUT /api/orders/:id | orderuser cancels own order | orderuser1 logged in; ord1 (status "pending") belongs to orderuser1 | PUT /api/orders/ord1 {status: "cancelled"} | status 200, order status updated to "cancelled" |
| PUT /api/orders/:id | orderuser cancels other's order | orderuser1 logged in; ord3 (status "pending") belongs to orderuser2 | PUT /api/orders/ord3 {status: "cancelled"} | status 403, response {error: "Access denied: this order belongs to another user"} |
| PUT /api/orders/:id | admin marks order completed | admin logged in; ord1 (status "pending") | PUT /api/orders/ord1 {status: "completed"} | status 200, order status updated to "completed" |
| PUT /api/orders/:id | orderuser marks order completed | orderuser logged in | PUT /api/orders/ord1 {status: "completed"} | status 403, response {error: "Access denied: admin only"} |
| PUT /api/orders/:id | unauthenticated | no session token | PUT /api/orders/ord1 {status: "cancelled"} without token | status 401, response {error: "Unauthorized: valid session required"} |
| Session timeout | token expires after 24 hours | user logged in; token exp set to T+24h | 24 hours pass, then GET /api/orders | status 401, response {error: "Unauthorized: valid session required"}, user auto-logged out |
| Session security | httpOnly cookie flag | user logs in | inspect Set-Cookie header in response | cookie has flags: httpOnly=true, Secure=true, SameSite=Strict; JavaScript cannot access via document.cookie |
| UI: Login page | page renders when unauthenticated | no user logged in | navigate to /login | login form displayed with username input, password input, "Login" button; no signup link shown |
| UI: Login page | redirect when authenticated | user logged in | navigate to /login | user redirected to home page (/) |
| UI: Navigation for admin | admin tabs | admin logged in | view navigation bar | tabs: "Products", "Orders", "Logout"; username "Admin" displayed |
| UI: Navigation for orderuser | orderuser tabs | orderuser logged in | view navigation bar | tabs: "Orders", "Logout"; "Products" hidden; username "OrderUser" displayed |
| UI: Navigation unauthenticated | public links | no user logged in | view navigation bar | only "Login" link visible; no signup link shown |
| UI: Products tab admin | admin can access | admin logged in | click "Products" tab or navigate to /products | products page loads, product management UI visible |
| UI: Products tab orderuser | orderuser cannot access | orderuser logged in | click "Products" tab (if visible) or try /products | tab not shown in navigation; if navigated to /products, "Access denied: admin only" error displayed |
| UI: Reports tab admin | admin can access | admin logged in | click "Reports" tab or navigate to /reports | reports page loads, order statistics displayed |
| UI: Reports tab orderuser | orderuser cannot access | orderuser logged in | click "Reports" tab (if visible) or try /reports | tab not shown in navigation; if navigated to /reports, "Access denied: admin only" error displayed |
| UI: Logout button | logout clears session | user logged in | click "Logout" button | status 200, session cookie cleared, user redirected to /login, Logout button disappears from navigation |
| Form validation (UI) | login form client-side | login form displayed | leave username blank, click Login | client-side error shown, no API call made |
| Form validation (UI) | login form client-side | login form displayed | leave password blank, click Login | client-side error shown, no API call made |
| Token validation | malformed token rejected | user attempts to use a token that is not valid JWT | API request with malformed token in cookie | status 401, response {error: "Unauthorized: valid session required"} |

## Spec Readiness Checklist

- [x] Every AC has a precise expected value — no "works correctly"
  - Each AC specifies exact HTTP status codes, response payloads (exact error messages), cookie flags, UI states, and login credentials
  
- [x] Another person could write a test from each AC without asking
  - ACs describe exact pre-conditions (Given), actions (When), and observable outcomes (Then) with specific hardcoded username/password values
  
- [x] Every AC can fail — one that cannot fail proves nothing
  - ACs test happy paths (AC1, AC2, AC9, AC12, AC15, AC20, AC23, AC24, AC26, AC29, AC35-38, AC41-45), error cases (AC3-7, AC10-11, AC13-19, AC21-22, AC25, AC27-28, AC30, AC33-34, AC39-40), edge cases (AC8, AC22, AC27, AC31-32, AC36-37)
  
- [x] Error and edge cases have ACs of their own
  - Error cases: AC3-7 (login errors), AC10-11 (logout/auth errors), AC13-19 (product/reports authorization errors), AC21-22, AC25, AC27-28, AC30, AC33-34 (order authorization errors), AC39-40 (token errors)
  - Edge cases: AC8 (token expiry), AC22 (orderuser trying to override userId), AC28 (orderuser trying to access another's order), AC31-32, AC36-37
  
- [x] Every AC appears in the testing strategy table
  - All 45 ACs mapped to comprehensive test cases; multiple test cases per AC for happy path + error variants + edge cases
