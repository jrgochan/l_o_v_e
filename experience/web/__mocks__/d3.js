module.exports = {
  scaleLinear: () => ({ domain: () => ({ range: () => 0 }) }),
  select: () => ({ append: () => ({ attr: () => ({ style: () => {} }) }) }),
  // Add other d3 functions as needed for smoke tests to pass
};
