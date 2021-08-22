const moment = require('moment-timezone');

const getTime = () => {
    let time = moment(Date.now())
      .tz('America/Chicago')
      .format('LT');
    let timezoneAbbr = moment.tz.zone('America/Chicago').abbr(360);
    return time + ' ' + timezoneAbbr;
}

const formatTime = (ms) => {
  let time = moment(new Date(ms))
    .tz('America/Chicago')
    .format('dddd, MMMM Do LTS');
  let timezoneAbbr = moment.tz.zone('America/Chicago').abbr(360);
  return time + ' ' + timezoneAbbr;
}

module.exports = {
    getTime,
    formatTime
}