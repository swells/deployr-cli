module.exports = {
    format: function(timestamp) {
        var date = new Date(timestamp),
            year = date.getFullYear(),
            month = (date.getMonth() + 1),
            day = date.getDate(),
            hour = date.getHours(),
            min = date.getMinutes(),
            sec = date.getSeconds(),
            zone = date.getTimezoneOffset(),
            format = '',
            leftZeroFill = function(number, targetLength, forceSign) {
                var output = '' + Math.abs(number),
                    sign = number >= 0;

                while (output.length < targetLength) {
                    output = '0' + output;
                }


                return (sign ? (forceSign ? '+' : '') : '-') + output;
            };

        month = (month < 10 ? '0' + month : month);
        hour = (hour < 10 ? '0' + hour : hour);
        min = (min < 10 ? '0' + min : min);
        sec = (sec < 10 ? '0' + sec : sec);
        format = 'job-' + year + '-' + month + '-' + day;

        var time = hour + ':' + min + ':' + sec,
            a = -zone,
            b = "+";

        if (a < 0) {
            a = -a;
            b = "-";
        }

        zone = b + leftZeroFill((a / 60), 2) + '' + leftZeroFill(a % 60, 2);
        format += (' ' + time + ' ' + zone);

        return format;
    }
};
