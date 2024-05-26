const pagination = (query) => {
    const page = query.page ? parseInt(query.page) : 1;
    const limit = query.perPage ? parseInt(query.perPage) : 10;

    if (typeof page !== 'number' || typeof limit !== 'number' || isNaN(page) || isNaN(limit)) {
        throw new Error('page & perPage must be type of number');
    } else if (page < 1 || limit < 1) {
        throw new Error('page or limit can not be less than 1');
    }

    const skip = (page - 1) * limit;

    return { limit, skip }
};

const updateRegexName = (obj) => {
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (key === 'name' && obj[key] && typeof obj[key] === 'object' && '$regex' in obj[key]) {
                obj[key].$regex = new RegExp(obj[key].$regex, 'i');
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                updateRegexName(obj[key]);
            }
        }
    }
}

module.exports = {
    pagination,
    updateRegexName,
}