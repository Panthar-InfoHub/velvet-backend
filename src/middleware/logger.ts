import { createLogger, format, transports, addColors } from 'winston';
const { combine, timestamp, printf, colorize, splat } = format;

// Define your custom color scheme for levels
const customColors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'cyan',
    debug: 'magenta',
};

// Tell Winston about these colors
addColors(customColors);

const customFormat = printf(({ timestamp, level, message, ...meta }) => {
    const splatArgs: any = meta[Symbol.for('splat')] || [];
    const splatString = splatArgs.length ? splatArgs.map((arg: any) => {
        if (typeof arg === 'object') return JSON.stringify(arg, null, 2);
        return String(arg);
    }).join(' ') : '';
    return `${timestamp} [${level}]: ${message} ${splatString}\n`;
});



const logger = createLogger({
    level: 'debug',
    format: combine(
        colorize({ all: true, colors: customColors }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        splat(),
        customFormat
    ),
    transports: [
        new transports.Console()
    ],
    exitOnError: false,
});

export default logger;