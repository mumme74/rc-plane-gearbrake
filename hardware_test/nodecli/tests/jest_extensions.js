expect.extend({
  toBeAlphaNumeric(received){
    let pass = /^[a-z0-9]*$/.test(received);
    return {
      pass,
      message: ()=>`Expected ${received} to only have alphanumeric chars`
    }
  }
})