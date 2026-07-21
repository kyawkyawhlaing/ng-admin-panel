import { AuthenticationRequirementMode } from './authentication-process';

export interface AuthenticationRouteConfiguration {
  id?: number;
  route_pattern: string;
  http_method: string;
  mode: AuthenticationRequirementMode;
  description?: string | null;
  priority: number;
  is_enabled: boolean;
}

export const HTTP_METHOD_OPTIONS = ['*', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
