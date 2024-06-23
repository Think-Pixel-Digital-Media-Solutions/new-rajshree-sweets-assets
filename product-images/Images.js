const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const readline = require('readline');

const imageExtensions = ['.jpg'];
const imageCompressionSettings = { width: 500, height: 500, quality: 100, lossless: true, fit: 'cover' };
const folderNames = [];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question(`Please enter the operation number: 
1. Create folders 
2. Rename images 
3. Move files to folder 
4. Convert all the images to webp
5. Change extensions to Lowercase
6. Delete Empty Folders
7. Delete Webp Files\n`, (operation) => {
    handleOperation(operation);
    rl.close();
});

function handleOperation(operation) {
    switch (operation) {
        case '1':
            createFolders();
            break;
        case '2':
            renameImagesInFolder();
            break;
        case '3':
            moveFilesToFolder();
            break;
        case '4':
            convertAndCropImagesInFolder(__dirname, imageCompressionSettings);
            break;
        case '5':
            changeExtensionsToLowercase(__dirname);
            break;
        case '6':
            deleteEmptyFolders(__dirname);
            break;
        case '7':
            deleteWebpFilesIfNonWebpExists(__dirname);
            break;
        default:
            console.log('Invalid operation');
    }
}

async function createFolders() {
    try {
        await Promise.all(folderNames.map(async (folder) => {
            const folderPath = path.join(__dirname, folder);
            await fs.mkdir(folderPath, { recursive: true });
        }));
    } catch (err) {
        console.error(`Failed to create folders: ${err}`);
    }
}

async function renameImagesInFolder(folderPath) {
    try {
        const files = await fs.readdir(folderPath);
        let imageNumber = 1;

        await Promise.all(files.map(async (file) => {
            const filePath = path.join(folderPath, file);
            const stat = await fs.stat(filePath);
            if (stat.isDirectory()) {
                await renameImagesInFolder(filePath);
            } else {
                const extension = path.extname(filePath).toLowerCase();
                if (imageExtensions.includes(extension)) {
                    const newPath = path.join(folderPath, `${imageNumber}${extension}`);
                    await fs.rename(filePath, newPath);
                    imageNumber++;
                }
            }
        }));
    } catch (err) {
        console.error(`Failed to rename images in folder ${folderPath}: ${err}`);
    }
}

async function moveFilesToFolder() {
    try {
        const files = await fs.readdir(__dirname);
        await Promise.all(files.map(async (file) => {
            const filePath = path.join(__dirname, file);
            const stat = await fs.stat(filePath);
            if (stat.isFile()) {
                const extension = path.extname(filePath).toLowerCase();
                if (imageExtensions.includes(extension)) {
                    const baseName = path.basename(filePath, extension);
                    const folderName = baseName.replace(/ - \d+$/, '');
                    const folderPath = path.join(__dirname, folderName);
                    await fs.mkdir(folderPath, { recursive: true });
                    const newFilePath = path.join(folderPath, file);
                    await fs.rename(filePath, newFilePath);
                }
            }
        }));
    } catch (err) {
        console.error(`Failed to move files to folder: ${err}`);
    }
}

async function changeExtensionsToLowercase(dirPath) {
    try {
        const files = await fs.readdir(dirPath);
        await Promise.all(files.map(async (file) => {
            const filePath = path.join(dirPath, file);
            const stat = await fs.stat(filePath);
            if (stat.isDirectory()) {
                await changeExtensionsToLowercase(filePath);
            } else {
                const extension = path.extname(filePath).toLowerCase();
                if (imageExtensions.includes(extension)) {
                    const newFilePath = path.join(dirPath, `${path.basename(file, extension)}${extension}`);
                    await fs.rename(filePath, newFilePath);
                }
            }
        }));
    } catch (err) {
        console.error(`Failed to change extensions to lowercase: ${err}`);
    }
}

async function convertAndCropImagesInFolder(folderPath, settings) {
    try {
        const files = await fs.readdir(folderPath);
        await Promise.all(files.map(async (file) => {
            const filePath = path.join(folderPath, file);
            const stat = await fs.stat(filePath);
            if (stat.isDirectory()) {
                await convertAndCropImagesInFolder(filePath, settings);
            } else if (stat.isFile() && imageExtensions.includes(path.extname(filePath).toLowerCase())) {
                const outputPath = path.join(folderPath, `${path.basename(file, path.extname(file))}.webp`);
                await sharp(filePath)
                    .resize({
                        width: settings.width,
                        height: settings.height,
                        fit: settings.fit
                    })
                    .webp({
                        quality: settings.quality,
                        lossless: settings.lossless
                    })
                    .toFile(outputPath);
            }
        }));
    } catch (err) {
        console.error(`Failed to convert and crop images in folder ${folderPath}: ${err}`);
    }
}

async function deleteEmptyFolders(dirPath) {
    try {
        const files = await fs.readdir(dirPath);
        await Promise.all(files.map(async (file) => {
            const filePath = path.join(dirPath, file);
            const stat = await fs.stat(filePath);
            if (stat.isDirectory()) {
                const filesInFolder = await fs.readdir(filePath);
                if (filesInFolder.length === 0) {
                    await fs.rmdir(filePath);
                    console.log(`Deleted empty folder ${filePath}`);
                }
            }
        }));
    } catch (err) {
        console.error(`Failed to delete empty folders: ${err}`);
    }
}

async function deleteWebpFilesIfNonWebpExists(dirPath) {
    try {
        const files = await fs.readdir(dirPath);
        let containsNonWebpFile = false;

        await Promise.all(files.map(async (file) => {
            const filePath = path.join(dirPath, file);
            const stat = await fs.stat(filePath);
            if (stat.isDirectory()) {
                await deleteWebpFilesIfNonWebpExists(filePath);
            } else if (path.extname(filePath).toLowerCase() !== '.webp') {
                containsNonWebpFile = true;
            }
        }));

        if (containsNonWebpFile) {
            await Promise.all(files.map(async (file) => {
                const filePath = path.join(dirPath, file);
                if (!await fs.stat(filePath).then(stat => stat.isDirectory()) && path.extname(filePath).toLowerCase() === '.webp') {
                    await fs.unlink(filePath);
                    console.log(`Deleted file ${filePath}`);
                }
            }));
        }
    } catch (err) {
        console.error(`Failed to delete webp files: ${err}`);
    }
}
