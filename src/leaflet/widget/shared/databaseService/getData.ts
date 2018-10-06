export function getDataByXPath(xPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
        mx.data.get({
            xpath: xPath,
            callback: (data) => {
                resolve(data)
            },
            error: (e) => {
                console.log(e);
                reject(e);
            }
        })
    })
}
export function getDataByEntity(entityName: string): Promise<mendix.lib.MxObject[]> {
    if (!entityName) return new Promise(resolve => resolve([]));
    let xPath = `//${entityName}`
    return getDataByXPath(xPath)
}
export function getImageByUrl(urlDoc: string): Promise<string> {
    return new Promise((resolve, reject) => {
        mx.data.getImageUrl(urlDoc, objectUrl => {
            resolve(objectUrl);
        },
            error => reject(error));
    })
}
export async function getDataByAssociations(destinationEntity: string, associations: string | string[], guid?: string): Promise<mendix.lib.MxObject[]> {
    associations = ([] as string[]).concat(associations);
    let associationXPath = associations.map(association => {
        if (!association) return "";
        return association + (guid ? `=${guid}` : "");
    }).filter(association => association !== "").join(" or ");
    if (!associationXPath) return [];
    let xPath = `//${destinationEntity}[${associationXPath}]`
    return await getDataByXPath(xPath);
}
export function getDataByGuid(guid: string): Promise<mendix.lib.MxObject> {
    return new Promise((resolve, reject) => {
        mx.data.get({
            guid: guid,
            callback: (data) => {
                resolve(data)
            },
            error: (e) => {
                console.log(e);
                reject(e);
            }
        });
    })
}