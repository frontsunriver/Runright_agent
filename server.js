const express = require('express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const os = require('os');
const disk = require('diskusage');

// Load the protobuf
const packageDefinition = protoLoader.loadSync('proto/service.proto', {});
const proto = grpc.loadPackageDefinition(packageDefinition).AvaProtos;

// Create a gRPC client
const client = new proto.Reports('localhost:50051', grpc.credentials.createInsecure());

const app = express();
const PORT = 3000;

const path = require('path');
const diskPath = path.parse(process.cwd()).root;

// API endpoint to call the gRPC service
app.get('/api/data', (req, res) => {
    const query = req.query.q; // Get query parameter

    client.GetData({ query: query }, (error, response) => {
        if (error) {
            console.error(error);
            return res.status(500).send('Error communicating with gRPC server');
        }
        disk.check(diskPath, (err, info) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log(`Total Disk Size: ${(info.total / (1024 ** 3)).toFixed(2)} GB`);
            console.log(`Free Disk Space: ${(info.free / (1024 ** 3)).toFixed(2)} GB`);
            console.log(`Used Disk Space: ${(info.used / (1024 ** 3)).toFixed(2)} GB`);
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            console.log(`Total Memory: ${(totalMemory / (1024 ** 2)).toFixed(2)} MB`);
            console.log(`Free Memory: ${(freeMemory / (1024 ** 2)).toFixed(2)} MB`);
            console.log(`Used Memory: ${((totalMemory - freeMemory) / (1024 ** 2)).toFixed(2)} MB`);
            res.json({ result: {disk: response.disk, memory: response.memory}, "TotalMemory": `${(totalMemory / (1024 ** 2)).toFixed(2)}MB`, "FreeMemory": `${(freeMemory / (1024 ** 2)).toFixed(2)} MB`, "UsedMemory": `${((totalMemory - freeMemory) / (1024 ** 2)).toFixed(2)} MB`, "HardDiskSize": `${(info.total / (1024 ** 3)).toFixed(2)} GB`, "FreeDiskSpace": `${(info.free / (1024 ** 3)).toFixed(2)} GB`, "UsedDiskSpace": `${(info.total / (1024 ** 3)).toFixed(2) - (info.free / (1024 ** 3)).toFixed(2)} GB` });
        });
        
    });
});

app.listen(PORT, () => {
    console.log(`Express server running at http://localhost:${PORT}`);
});
