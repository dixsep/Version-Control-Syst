
import path from 'path';
import fs from 'fs/promises'
import crypto from 'crypto'

class Groot{

    constructor(repoPath = '.'){

        this.repoPath = path.join(repoPath, '.groot');
        this.objectsPath = path.join(this.repoPath, 'objects');  // .groot/objects  (Folder)  stores file content
        this.headPath = path.join(this.repoPath, 'HEAD');        // .groot/HEAD (File) has prev_commit_hash
        this.indexPath = path.join(this.repoPath, 'index');      // .groot/index   (File) (contains all staged changes to be commited) (file_name, filehash)

        this.init();
    }

    async init(){

        await fs.mkdir(this.objectsPath, {recursive: true});   // backward recursion

        try{
            await fs.writeFile(this.headPath, '', {flag : 'wx'});
        } catch(error){
            console.log("Head already initialised in groot folder");
        }

        try{
            await fs.writeFile(this.indexPath, JSON.stringify([]), {flag : 'wx'});
        } catch(error){
            console.log("Index already exists in groot folder");
        }
    }

    hashObject(content){
        return crypto.createHash('sha1').update(content, 'utf-8').digest('hex');
        //sha1 : 40 char hexadecimal string
        // digest : calculates value of hexadecimal string
    }

    async add(fileToBeAdded){

        //read file and get content
        const file_data = await fs.readFile(fileToBeAdded, {encoding : 'utf-8'});
        const file_hash = this.hashObject(file_data);

        // create path for file
        const newFileHashedObjectPath = path.join(this.objectsPath, file_hash);

        // write to file
        await fs.writeFile(newFileHashedObjectPath, file_data);

        // Add to Staging area
        this.updateStagingArea(fileToBeAdded, file_hash);

        // added to objects and staging area
        console.log(`Added ${fileToBeAdded} to Objects folder with name : ${file_hash}`);
    }

    async updateStagingArea(filepath, filehash){

        // read
        const index = JSON.parse(await fs.readFile(this.indexPath, {encoding : 'utf-8'}));
        //update
        index.push({path : filepath, hash : filehash});
        //write
        await fs.writeFile(this.indexPath, JSON.stringify(index));

    }

    async commit(message){

        //read staging area
        const index = JSON.parse(await fs.readFile(this.indexPath, {encoding : 'utf-8'}));

        // last commit is pointed by HEAD
        const parentCommit = await this.getCurrentHead();

        const commitData = {
            timeStamp : new Date().toISOString(),
            message,
            files : index,
            parent : parentCommit
        }

        const commitHash = this.hashObject(JSON.stringify(commitData));

        // add to objects folder
        const commitPath = await path.join(this.objectsPath, commitHash);
        await fs.writeFile(commitPath, JSON.stringify(commitData));

        //update Head
        await fs.writeFile(this.headPath, commitHash);

        //update staging area
        await fs.writeFile(this.indexPath, JSON.stringify([]));

        console.log("Commit successful \n");
    }

    async getCurrentHead(){

        try{
            return await fs.readFile(this.headPath, {encoding : 'utf-8'});
        } catch(error){
            return null;
        }
    }

    async log(){

        let curCommitHash = await this.getCurrentHead();

        while(curCommitHash){
            const commitData = JSON.parse(await fs.readFile(path.join(this.objectsPath, curCommitHash), {encoding : 'utf-8'}));
            // display commitData
            curCommitHash = commitData.parent;
        }
    }

    async showDiff(currentHash){

        /*
            get commit Data from (Objects File)
            get parentHash, and apply same
            Now compare the files
         */

        const commitData = await this.getCommitData(currentHash);

        if(commitData == null){
            cout << "Commit Not Found \n";
            return ;
        }

        const parentHash = commitData.parent;
        const parentCommitData = await this.getCommitData(parentHash);

        const files = commitData.files;
        const parentFiles = parentCommitData.files;

        for(let i = 0; i < files.size(); ++i){

            const curFile = files[i];
            const corParentFile = await this.fileInParent(curFile, parentFiles);

            if(corParentFile != null){

                // check the changes in the data
                // get hashes
                // get fileData

                const curFileData = this.getFileData(curFile.hash);
                const parFileData = this.getFileData(corParentFile.hash);

            }
        }
    }

    async getFileData(fileHash){

        // check in objects Folder
        // and retrieve data

        try{
            const fileData = await fs.readFile(path.join(this.objectsPath, fileHash), {encoding : 'utf-8'});
            return fileData;
        } catch(error){

            cout << "FILE not found \n";
            return null;
        }
    }

    fileInParent(file, parentFiles){

        // path of files will be same !!

        for(let i = 0; i < parentFiles.size(); ++i){
            if(parentFiles[i].path == file.path){
                return parentFiles[i];
            }
        }

        return null;
    }

    async getCommitData(currentHash){

        try{
            const commitData = JSON.parse(await fs.readFile(path.join(this.objectsPath, currentHash), {encoding : 'utf-8'}));
            return commitData;
        } catch(error){
            cout << "No commit Found \n";
            return null;
        }
    }
}

(async () => {

    const groot = new Groot();
    await groot.add('sample.txt');
    await groot.commit('First commit');

    await groot.log();
})();

// the above function will call