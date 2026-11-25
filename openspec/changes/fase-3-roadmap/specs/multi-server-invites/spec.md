# Spec: Multi-servidor e Convites

## ADDED Requirements

### Requirement: Server creation and switching

The system SHALL allow authorized users to create new servers/workspaces and switch between servers they belong to from the left rail of `WorkspaceSidebar`.

#### Scenario: Creating a new server from the sidebar

- **WHEN** an authorized user clicks the `+` button in `WorkspaceSidebar` and submits a valid server name
- **THEN** the backend creates the server, assigns the creator as owner/admin, initializes default channels, and switches the client to the new server.

#### Scenario: Switching active server

- **WHEN** a member selects another server in the left rail
- **THEN** the WebSocket and stores switch context to the selected `serverId`, loading that server's channels, desks, and online members without leaking state from the previous server.

### Requirement: Invite links and codes

The system SHALL allow server administrators to generate invite codes/links with optional expiration and max uses, and allow authenticated users to join a server using a valid invite.

#### Scenario: Joining via valid invite

- **WHEN** a user submits a valid, non-expired invite code/link
- **THEN** the user is added as a member of the target server and the server becomes available in their sidebar.

#### Scenario: Expired or revoked invite

- **WHEN** a user submits an expired, exhausted, or revoked invite
- **THEN** the system rejects the request with a clear Portuguese (BR) error message.
