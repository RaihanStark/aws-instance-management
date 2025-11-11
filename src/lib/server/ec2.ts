import { EC2Client, DescribeInstancesCommand, StartInstancesCommand, StopInstancesCommand } from '@aws-sdk/client-ec2';
import { env } from '$env/dynamic/private';

let ec2Client: EC2Client | null = null;

function getEC2Client(): EC2Client {
	if (!ec2Client) {
		ec2Client = new EC2Client({
			region: env.AWS_REGION || 'us-east-1',
			credentials: {
				accessKeyId: env.AWS_ACCESS_KEY_ID || '',
				secretAccessKey: env.AWS_SECRET_ACCESS_KEY || ''
			}
		});
	}
	return ec2Client;
}

export interface EC2Instance {
	id: string;
	name: string;
	type: string;
	state: 'running' | 'stopped' | 'pending' | 'stopping' | 'terminated';
	publicIp: string;
	launchTime: string;
	platform: 'Linux' | 'Windows';
}

/**
 * Get all EC2 instances
 */
export async function listInstances(): Promise<EC2Instance[]> {
	const client = getEC2Client();

	try {
		const command = new DescribeInstancesCommand({});
		const response = await client.send(command);

		const instances: EC2Instance[] = [];

		if (response.Reservations) {
			for (const reservation of response.Reservations) {
				if (reservation.Instances) {
					for (const instance of reservation.Instances) {
						// Skip terminated instances
						if (instance.State?.Name === 'terminated') {
							continue;
						}

						const nameTag = instance.Tags?.find(tag => tag.Key === 'Name');

						// Determine platform: if Platform field exists and is 'windows', it's Windows, otherwise Linux
						const platform: 'Linux' | 'Windows' = instance.Platform?.toLowerCase() === 'windows' ? 'Windows' : 'Linux';

						instances.push({
							id: instance.InstanceId || 'Unknown',
							name: nameTag?.Value || 'Unnamed Instance',
							type: instance.InstanceType || 'Unknown',
							state: (instance.State?.Name as EC2Instance['state']) || 'stopped',
							publicIp: instance.PublicIpAddress || '-',
							launchTime: instance.LaunchTime?.toISOString().replace('T', ' ').substring(0, 19) || 'Unknown',
							platform
						});
					}
				}
			}
		}

		return instances;
	} catch (error) {
		console.error('Error listing EC2 instances:', error);
		throw new Error('Failed to fetch EC2 instances');
	}
}

/**
 * Start an EC2 instance
 */
export async function startInstance(instanceId: string): Promise<void> {
	const client = getEC2Client();

	try {
		const command = new StartInstancesCommand({
			InstanceIds: [instanceId]
		});
		await client.send(command);
	} catch (error) {
		console.error('Error starting EC2 instance:', error);
		throw new Error('Failed to start EC2 instance');
	}
}

/**
 * Stop an EC2 instance
 */
export async function stopInstance(instanceId: string): Promise<void> {
	const client = getEC2Client();

	try {
		const command = new StopInstancesCommand({
			InstanceIds: [instanceId]
		});
		await client.send(command);
	} catch (error) {
		console.error('Error stopping EC2 instance:', error);
		throw new Error('Failed to stop EC2 instance');
	}
}
