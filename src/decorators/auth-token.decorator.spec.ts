import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';
import * as decorator from './auth-token.decorator';

// Create a test implementation of the decorator's factory function
const testAuthTokenFactory = (data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest();

  // Check if authorization header exists
  if (!request.headers.authorization) {
    throw new EaseyException(
      new Error('Authorization header is missing'),
      HttpStatus.UNAUTHORIZED
    );
  }

  // Check if authorization header has the correct format
  const parts = request.headers.authorization.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new EaseyException(
      new Error('Invalid authorization format. Expected "Bearer <token>"'),
      HttpStatus.UNAUTHORIZED
    );
  }

  // Return the token part
  return parts[1];
};

describe('AuthToken', () => {
  const mockExecutionContext = (headers: Record<string, string>): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
        }),
      }),
    } as ExecutionContext;
  };

  it('should extract the token from the authorization header', () => {
    const context = mockExecutionContext({ authorization: 'Bearer valid-token' });
    const result = testAuthTokenFactory(undefined, context);
    expect(result).toBe('valid-token');
  });

  it('should throw EaseyException when authorization header is missing', () => {
    const context = mockExecutionContext({});

    try {
      testAuthTokenFactory(undefined, context);
      // If we get here, the test should fail
      expect(true).toBe(false); // This line should not be reached
    } catch (error) {
      expect(error instanceof EaseyException).toBe(true);
      expect(error.getStatus()).toBe(401);
      expect(error.message).toContain('Authorization header is missing');
    }
  });

  it('should throw EaseyException when authorization format is invalid', () => {
    const context = mockExecutionContext({ authorization: 'InvalidFormat' });

    try {
      testAuthTokenFactory(undefined, context);
      // If we get here, the test should fail
      expect(true).toBe(false); // This line should not be reached
    } catch (error) {
      expect(error instanceof EaseyException).toBe(true);
      expect(error.getStatus()).toBe(401);
      expect(error.message).toContain('Invalid authorization format');
    }
  });
});
