// MongoDB service for user validation and team collaboration
import { WorkspaceInvitation, WorkspaceMember } from '../context/DatabaseContext';

// Enhanced MongoDB service with proper error handling and validation
class MongoService {
  private baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') + '/api' || 'http://localhost:5000/api';

  // Helper method to get authentication headers
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  // Enhanced username validation with proper error handling
  async validateUsername(username: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/users/validate`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ username })
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('Authentication failed. Please log in again.');
          // Optionally redirect to login page
          window.location.href = '/';
          return false;
        }
        console.error(`Username validation failed: HTTP ${response.status}: ${response.statusText}`);
        return false;
      }

      const data = await response.json();
      return Boolean(data.exists);
    } catch (error) {
      console.error('Error validating username:', error);
      return false;
    }
  }

  // Enhanced invitation saving with proper validation
  async saveInvitation(invitation: WorkspaceInvitation): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/invitations`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          ...invitation,
          createdAt: invitation.createdAt.toISOString(),
          expiresAt: invitation.expiresAt.toISOString()
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('Authentication failed while saving invitation. Please log in again.');
          window.location.href = '/';
          return false;
        }
        const errorData = await response.json().catch(() => ({}));
        console.error(`Failed to save invitation: ${response.status}`, errorData);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving invitation:', error);
      return false;
    }
  }

  // Enhanced invitation status update
  async updateInvitationStatus(invitationId: string, status: 'accepted' | 'expired'): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/invitations/${invitationId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Failed to update invitation status: ${response.status}`, errorData);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating invitation status:', error);
      return false;
    }
  }

  // Enhanced workspace invitations retrieval with proper filtering
  async getWorkspaceInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
    try {
      const response = await fetch(`${this.baseUrl}/invitations?workspaceId=${encodeURIComponent(workspaceId)}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        console.error(`Failed to fetch invitations: ${response.status}`);
        return [];
      }

      const data = await response.json();
      
      // Convert date strings back to Date objects
      return data.map((inv: any) => ({
        ...inv,
        createdAt: new Date(inv.createdAt),
        expiresAt: new Date(inv.expiresAt)
      }));
    } catch (error) {
      console.error('Error fetching workspace invitations:', error);
      return [];
    }
  }

  // Enhanced workspace member saving
  async saveWorkspaceMember(member: WorkspaceMember, workspaceId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/members`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          ...member,
          workspaceId,
          joinedAt: member.joinedAt.toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Failed to save workspace member: ${response.status}`, errorData);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving workspace member:', error);
      return false;
    }
  }

  // Enhanced workspace members retrieval
  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    try {
      const response = await fetch(`${this.baseUrl}/members?workspaceId=${encodeURIComponent(workspaceId)}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        console.error(`Failed to fetch workspace members: ${response.status}`);
        return [];
      }

      const data = await response.json();
      
      // Convert date strings back to Date objects
      return data.map((member: any) => ({
        ...member,
        joinedAt: new Date(member.joinedAt)
      }));
    } catch (error) {
      console.error('Error fetching workspace members:', error);
      return [];
    }
  }

  // Enhanced workspace update with proper error handling
  async updateWorkspace(workspaceId: string, data: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/workspaces/${encodeURIComponent(workspaceId)}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          ...data,
          updatedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Failed to update workspace: ${response.status}`, errorData);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating workspace:', error);
      return false;
    }
  }

  // Enhanced user workspaces retrieval
  async getUserWorkspaces(username: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/workspaces?username=${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        console.error(`Failed to fetch user workspaces: ${response.status}`);
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user workspaces:', error);
      return [];
    }
  }

  // New method: Validate join code before acceptance
  async validateJoinCode(joinCode: string): Promise<{ valid: boolean; invitation?: WorkspaceInvitation; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/invitations/validate`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ joinCode: joinCode.toUpperCase() })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { 
          valid: false, 
          error: errorData.message || 'Invalid or expired join code' 
        };
      }

      const data = await response.json();
      
      if (data.invitation) {
        // Convert date strings back to Date objects
        data.invitation.createdAt = new Date(data.invitation.createdAt);
        data.invitation.expiresAt = new Date(data.invitation.expiresAt);
      }

      return { 
        valid: data.valid, 
        invitation: data.invitation,
        error: data.error 
      };
    } catch (error) {
      console.error('Error validating join code:', error);
      return { 
        valid: false, 
        error: 'Network error. Please check your connection and try again.' 
      };
    }
  }
}
export const mongoService = new MongoService();
