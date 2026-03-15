Rules for Implementation of a feature:

If no requirement is provided, look for all requirements that have been edited since the last commit.  If there are no changes, stop and ask the user which requirement they want to implement.

Steps:

1. Analyze the given requirements.
  [] Check for clarity - If the requirement is unclear or inconsistent stop to ask the user clarifying questions and update the requirement.  If changes are made, redo this step until there are no changes made.

2. Implementation
  [] Annotate code with the ID of the requirement
  [] Tests cover the functionality of the requirement
  [] Run tests for the requirements
  [] Update user documentation as needed to reflect the new functionality.  User facing documentation shall not include references to the requirement ID.

3. Clean-up
  [] Remove code and features attributed to earlier versions of the requirement that are no longer a part of the requirement.  Notify the user of these removals.
  [] Run all test suites to verify there are no regressions
  [] Tests shall run without warnings or console output from the code under test
  [] Ensure that there are no npm vulnerabilities in the installed dependencies

User Feedback:
* When the user provides follow-up statements, the requirements should be updated to reflect any changes to the base requirement.  Small tweaks, debugging, and technical detail should not be added to the requirements.

