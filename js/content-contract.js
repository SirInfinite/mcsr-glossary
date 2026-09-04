const freezeList = values => Object.freeze([...values]);

export const TERM_CONTRACT = Object.freeze({
    schemaVersion: 3,
    requiredFields: freezeList([
        "id",
        "name",
        "category",
        "status",
        "aliases",
        "tags",
        "definition",
        "relatedTerms",
        "creationDate",
        "needsUpdating",
        "updatedDate"
    ]),
    optionalFields: freezeList(["historicalNote", "media"]),
    categories: freezeList([
        "format",
        "strategy",
        "technique",
        "terminology",
        "tool"
    ]),
    statuses: freezeList(["current", "historical", "legacy"]),
    arrayFields: freezeList(["aliases", "tags", "relatedTerms"]),
    dateFields: freezeList(["creationDate", "updatedDate"]),
    limits: Object.freeze({
        nameMin: 2,
        nameMax: 100,
        aliasesMax: 10,
        aliasMax: 80,
        tagsMax: 12,
        tagMax: 40,
        relatedTermsMax: 20,
        historicalNoteMin: 20,
        historicalNoteMax: 500,
        definitionMin: 20,
        definitionMax: 5000,
        definitionWarningMin: 80,
        definitionWarningMax: 1200
    }),
    uuidPattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    tagPattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    datePattern: /^\d{4}-\d{2}-\d{2}$/
});

const MEDIA_COMMON_FIELDS = ["type", "src", "title", "caption", "credit", "sourceUrl"];

export const MEDIA_CONTRACT = Object.freeze({
    types: freezeList(["youtube", "twitch", "image", "gif", "video", "link"]),
    externalImageHosts: freezeList(["minecraft.wiki", "upload.wikimedia.org"]),
    commonFields: freezeList(MEDIA_COMMON_FIELDS),
    requiredFields: freezeList(MEDIA_COMMON_FIELDS),
    typeFields: Object.freeze({
        youtube: freezeList(["start"]),
        twitch: freezeList([]),
        image: freezeList(["alt", "width", "height"]),
        gif: freezeList(["alt", "width", "height", "poster"]),
        video: freezeList(["width", "height", "poster", "hasAudio", "captions"]),
        link: freezeList([])
    }),
    requiredTypeFields: Object.freeze({
        youtube: freezeList([]),
        twitch: freezeList([]),
        image: freezeList(["alt", "width", "height"]),
        gif: freezeList(["alt", "width", "height", "poster"]),
        video: freezeList(["width", "height", "hasAudio"]),
        link: freezeList([])
    }),
    limits: Object.freeze({
        maxItems: 6,
        titleMax: 140,
        captionMax: 500,
        creditNameMax: 100,
        altMax: 240,
        maxStart: 86400,
        maxDimension: 4096
    }),
    youtubeIDPattern: /^[a-zA-Z0-9_-]{11}$/,
    twitchSlugPattern: /^[a-zA-Z0-9_-]{1,100}$/,
    localImagePattern: /^images\/media\/[a-zA-Z0-9/_-]+\.(?:avif|jpe?g|png|svg|webp)$/i,
    localGifPattern: /^images\/media\/[a-zA-Z0-9/_-]+\.gif$/i,
    localVideoPattern: /^media\/[a-zA-Z0-9/_-]+\.(?:mp4|webm)$/i,
    localCaptionPattern: /^media\/[a-zA-Z0-9/_-]+\.vtt$/i
});

export function slugifyTermName(name = "") {
    return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function isValidEditorialDate(value) {
    if (value === "") return true;
    if (typeof value !== "string" || !TERM_CONTRACT.datePattern.test(value)) return false;

    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year
        && parsed.getUTCMonth() === month - 1
        && parsed.getUTCDate() === day;
}

function isTrimmedString(value, { min = 1, max = Infinity } = {}) {
    return typeof value === "string"
        && value === value.trim()
        && value.length >= min
        && value.length <= max;
}

function isHTTPSURL(value) {
    if (!isTrimmedString(value)) return false;
    try {
        return new URL(value).protocol === "https:";
    } catch {
        return false;
    }
}

function isAllowedImageSource(value, { gifOnly = false } = {}) {
    if (!isTrimmedString(value)) return false;
    const localPattern = gifOnly ? MEDIA_CONTRACT.localGifPattern : MEDIA_CONTRACT.localImagePattern;
    if (localPattern.test(value)) return true;

    try {
        const url = new URL(value);
        const hostAllowed = url.protocol === "https:"
            && MEDIA_CONTRACT.externalImageHosts.includes(url.hostname.toLowerCase());
        const extensionAllowed = gifOnly
            ? /\.gif$/i.test(url.pathname)
            : /\.(?:avif|jpe?g|png|svg|webp)$/i.test(url.pathname);
        return hostAllowed && extensionAllowed;
    } catch {
        return false;
    }
}

export function validateMediaItem(item) {
    const errors = [];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
        return ["must be an object"];
    }

    const type = typeof item.type === "string" ? item.type : "";
    if (!MEDIA_CONTRACT.types.includes(type)) {
        errors.push(`type must be one of: ${MEDIA_CONTRACT.types.join(", ")}`);
        return errors;
    }

    const allowedFields = new Set([
        ...MEDIA_CONTRACT.commonFields,
        ...MEDIA_CONTRACT.typeFields[type]
    ]);
    for (const field of Object.keys(item)) {
        if (!allowedFields.has(field)) errors.push(`unsupported field '${field}' for type '${type}'`);
    }
    for (const field of [...MEDIA_CONTRACT.requiredFields, ...MEDIA_CONTRACT.requiredTypeFields[type]]) {
        if (!Object.hasOwn(item, field)) errors.push(`missing required field '${field}'`);
    }

    if (!isTrimmedString(item.title, { min: 3, max: MEDIA_CONTRACT.limits.titleMax })) {
        errors.push(`title must be a trimmed string of 3-${MEDIA_CONTRACT.limits.titleMax} characters`);
    }
    if (!isTrimmedString(item.caption, { min: 10, max: MEDIA_CONTRACT.limits.captionMax })) {
        errors.push(`caption must be a trimmed string of 10-${MEDIA_CONTRACT.limits.captionMax} characters`);
    }
    if (!isHTTPSURL(item.sourceUrl)) errors.push("sourceUrl must be an HTTPS URL");

    if (!item.credit || typeof item.credit !== "object" || Array.isArray(item.credit)) {
        errors.push("credit must be an object with name and url");
    } else {
        const creditFields = Object.keys(item.credit);
        if (creditFields.some(field => !["name", "url"].includes(field))) {
            errors.push("credit contains an unsupported field");
        }
        if (!isTrimmedString(item.credit.name, { min: 1, max: MEDIA_CONTRACT.limits.creditNameMax })) {
            errors.push(`credit.name must be a trimmed string of 1-${MEDIA_CONTRACT.limits.creditNameMax} characters`);
        }
        if (!isHTTPSURL(item.credit.url)) errors.push("credit.url must be an HTTPS URL");
    }

    if (type === "youtube") {
        if (!MEDIA_CONTRACT.youtubeIDPattern.test(item.src || "")) errors.push("src must be an 11-character YouTube video ID");
        if (Object.hasOwn(item, "start") && (!Number.isInteger(item.start) || item.start < 0 || item.start > MEDIA_CONTRACT.limits.maxStart)) {
            errors.push(`start must be an integer from 0-${MEDIA_CONTRACT.limits.maxStart}`);
        }
    }
    if (type === "twitch" && !MEDIA_CONTRACT.twitchSlugPattern.test(item.src || "")) {
        errors.push("src must be a Twitch clip slug");
    }
    if (type === "image" && !isAllowedImageSource(item.src)) {
        errors.push(`src must be a local images/media image or an allowlisted HTTPS image (${MEDIA_CONTRACT.externalImageHosts.join(", ")})`);
    }
    if (type === "gif" && !isAllowedImageSource(item.src, { gifOnly: true })) {
        errors.push(`src must be a local images/media GIF or an allowlisted HTTPS GIF (${MEDIA_CONTRACT.externalImageHosts.join(", ")})`);
    }
    if (type === "video" && !MEDIA_CONTRACT.localVideoPattern.test(item.src || "")) {
        errors.push("src must be a local MP4 or WebM path under media/");
    }
    if (type === "link" && !isHTTPSURL(item.src)) errors.push("src must be an HTTPS URL");

    if (["image", "gif"].includes(type)) {
        if (!isTrimmedString(item.alt, { min: 5, max: MEDIA_CONTRACT.limits.altMax })) {
            errors.push(`alt must be a trimmed string of 5-${MEDIA_CONTRACT.limits.altMax} characters`);
        }
    }
    if (["image", "gif", "video"].includes(type)) {
        for (const field of ["width", "height"]) {
            if (!Number.isInteger(item[field]) || item[field] < 1 || item[field] > MEDIA_CONTRACT.limits.maxDimension) {
                errors.push(`${field} must be an integer from 1-${MEDIA_CONTRACT.limits.maxDimension}`);
            }
        }
    }
    if (["gif", "video"].includes(type) && Object.hasOwn(item, "poster")
        && !MEDIA_CONTRACT.localImagePattern.test(item.poster || "")) {
        errors.push("poster must be a local static image under images/media/");
    }
    if (type === "video") {
        if (typeof item.hasAudio !== "boolean") errors.push("hasAudio must be a boolean");
        if (Object.hasOwn(item, "captions") && !MEDIA_CONTRACT.localCaptionPattern.test(item.captions || "")) {
            errors.push("captions must be a local WebVTT path under media/");
        }
        if (item.hasAudio === true && !Object.hasOwn(item, "captions")) {
            errors.push("captions are required when hasAudio is true");
        }
    }

    return errors;
}
