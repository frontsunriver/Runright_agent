const fs = require('fs');
const express = require('express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const os = require('os');
const disk = require('diskusage');
const { product_mode } = require('./app/const/const');
const { sendEmail, checkCertificateFile, compareDates } = require('./app/utils/utility');

// Load the protobuf
const packageDefinition = protoLoader.loadSync('proto/service.proto', {});
const proto = grpc.loadPackageDefinition(packageDefinition).AvaProtos;

// Create a gRPC client
const client = new proto.Reports(product_mode == 0 ? 'localhost:50051' : 'api.runright.io:50051', grpc.credentials.createInsecure());

const app = express();
const PORT = 3000;

const path = require('path');
const diskPath = path.parse(process.cwd()).root;

app.get('/api/data', (req, res) => {
    const query = req.query.q;

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
            // console.log(`Total Disk Size: ${(info.total / (1024 ** 3)).toFixed(2)} GB`);
            // console.log(`Free Disk Space: ${(info.free / (1024 ** 3)).toFixed(2)} GB`);
            // console.log(`Used Disk Space: ${((info.total - info.free) / (1024 ** 3)).toFixed(2)} GB`);
            // console.log(`Total Memory: ${(os.totalmem() / (1024 ** 2)).toFixed(2)} MB`);
            // console.log(`Free Memory: ${(os.freemem() / (1024 ** 2)).toFixed(2)} MB`);
            // console.log(`Used Memory: ${((os.totalmem() - os.freemem()) / (1024 ** 2)).toFixed(2)} MB`);

            const certFilePath = '/var/www/html/app/assets/cert.pem';
            const fullChainPath = '/var/www/html/app/assets/fullchain.pem'

            const certFileValidStr = checkCertificateFile(certFilePath);
            const fullChainFileValidStr = checkCertificateFile(fullChainPath);

            if (!compareDates(certFileValidStr, response.certValid)) {
                fs.writeFile(certFilePath, response.cert, (err) => {
                    if (err) {
                        console.log('Error writing file: ' + err.message);
                    }
                    // SEND Email
                    console.log('Cert File overwritten successfully!');
                });
            }

            if (!compareDates(fullChainFileValidStr, response.fullchainValid)) {
                fs.writeFile(fullChainPath, response.fullchain, (err) => {
                    if (err) {
                        console.log('Error writing file: ' + err.message);
                    }
                    // SEND Email
                    console.log('FullChain File overwritten successfully!');
                });
            }

            const serverDiskPercent = response.diskPercent;
            const serverMemoryPercent = response.memoryPercent;

            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemory = totalMemory - freeMemory;

            const memoryUsagePercent = (usedMemory / totalMemory) * 100;
            if (memoryUsagePercent.toFixed(2) >= 90) {
                // SEND Email
                console.log('app.runright.io server memory is more than 90%. Please clean Memory!');
            }

            const diskUsagePercent = ((info.total - info.free) / info.total) * 100;

            if (diskUsagePercent.toFixed(2) >= 90) {
                // SEND Email;
                console.log('app.runright.io server Hard disk used more than 90%. Please clean or increase hard disk size!');
            }

            if (serverDiskPercent >= 90) {
                // SEND Email;
                console.log('api.runright.io server Hard disk used more than 90%. Please clean or increase hard disk size!');
            }

            if (serverMemoryPercent >= 90) {
                // SEND Email;
                console.log('api.runright.io server memory is more than 90%. Please clean Memory!');
            }

            const certValid = response.certValid;
            res.json({
                'api.runright.io': { total_disk: response.totalDisk, free_disk: response.freeDisk, used_disk: response.usedDisk, disk_percent: response.diskPercent, total_memory: response.totalMemory, free_memory: response.freeMemory, used_memory: response.usedMemory, memory_percent: response.memoryPercent },
                'app.runright.io': { disk_percent: diskUsagePercent.toFixed(2), memory_percent: memoryUsagePercent.toFixed(2) }
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Express server running at http://localhost:${PORT}`);
});
