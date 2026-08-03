## Purpose
This is a test specification for the authentication system.

## Requirements

### Requirement: User Authentication
The system SHALL provide secure user authentication

#### Scenario: Successful login
- **GIVEN** a user with valid credentials
- **WHEN** they submit the login form  
- **THEN** they are authenticated

### Requirement: Password Reset
The system SHALL allow users to reset their password

#### Scenario: Reset via email
- **GIVEN** a user with a registered email
- **WHEN** they request a password reset
- **THEN** they receive a reset link