export const parseToken = (token: string) => {
  let obj = {
    userId: null,
    sessionId: null,
    expiration: null,
  };

  const arr = token.split('&');
  arr.forEach(element => {
    const keyValue = element.split('=');
    obj[keyValue[0]] = keyValue[1];
  });

  return obj;
};
