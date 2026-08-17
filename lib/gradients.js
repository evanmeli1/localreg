// Pastel placeholder gradients used for listing cover images until real
// uploads exist. Rotated by card index so a grid never repeats side by side.

export const GRADIENTS = [
  'linear-gradient(135deg, #FFD9C0 0%, #FFB7A0 100%)',
  'linear-gradient(135deg, #CFE3FF 0%, #A8C7F5 100%)',
  'linear-gradient(135deg, #E4D8FB 0%, #C7B4F2 100%)',
  'linear-gradient(135deg, #CFEEDA 0%, #A5DCBA 100%)',
  'linear-gradient(135deg, #FBE7BE 0%, #F3CE91 100%)',
  'linear-gradient(135deg, #FFD6E3 0%, #F5AFC6 100%)',
  'linear-gradient(135deg, #D3EFF2 0%, #A6DCE3 100%)',
  'linear-gradient(135deg, #E8E4DC 0%, #CFC8BA 100%)',
];

export function gradientFor(index) {
  return GRADIENTS[index % GRADIENTS.length];
}
