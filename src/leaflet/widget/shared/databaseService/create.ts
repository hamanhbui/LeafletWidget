export function create(entity: string) {
    return new Promise<mendix.lib.MxObject>((resolve, reject) => {
        mx.data.create({
            entity: entity,
            callback: (object) => {
                resolve(object);
            },
            error: (e) => {
                console.log(e);
                reject(e);
            }
        })
    })
} 