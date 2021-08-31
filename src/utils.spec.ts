import { parseToken } from './utils';

describe('Utils', () => {
  it('should be defined', () => {
    expect(parseToken).toBeDefined();
  });

  describe('parseToken()', () => {
    it('should return an object parsed from a string', async () => {
      const data = 'userId=1&sessionId=1&expiration=1&clientIp=1';
      const refObj = {
        userId: '1',
        sessionId: '1',
        expiration: '1',
        clientIp: '1',
      };

      const result = parseToken(data);

      expect(result.userId).toEqual(refObj.userId);
      expect(result.sessionId).toEqual(refObj.sessionId);
      expect(result.expiration).toEqual(refObj.expiration);
      expect(result.clientIp).toEqual(refObj.clientIp);
    });
  });
});
