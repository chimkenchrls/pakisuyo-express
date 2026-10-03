export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 19;

const manilaHourFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  hour: 'numeric',
  hourCycle: 'h23',
});

export function manilaHour(date) {
  return Number(manilaHourFormat.format(date));
}

export function getHoursStatus(date = new Date()) {
  const hour = manilaHour(date);
  const isOpen = hour >= OPEN_HOUR && hour < CLOSE_HOUR;
  return { isOpen, label: isOpen ? 'Open today 8AM–7PM' : 'Closed now — opens 8AM' };
}
