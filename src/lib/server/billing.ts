import {
	CostExplorerClient,
	GetCostAndUsageCommand,
	type GetCostAndUsageCommandInput
} from '@aws-sdk/client-cost-explorer';
import { env } from '$env/dynamic/private';

let costExplorerClient: CostExplorerClient | null = null;

function getCostExplorerClient(): CostExplorerClient {
	if (!costExplorerClient) {
		costExplorerClient = new CostExplorerClient({
			region: 'us-east-1', // Cost Explorer only works in us-east-1
			credentials: {
				accessKeyId: env.AWS_ACCESS_KEY_ID || '',
				secretAccessKey: env.AWS_SECRET_ACCESS_KEY || ''
			}
		});
	}
	return costExplorerClient;
}

export interface InstanceBilling {
	instanceId: string;
	monthlyHours: number;
	monthlyCost: number;
}

/**
 * Get monthly billing hours and costs for EC2 instances
 */
export async function getMonthlyInstanceBilling(): Promise<{ [key: string]: InstanceBilling }> {
	const client = getCostExplorerClient();

	// Get first and last day of current month
	const now = new Date();
	const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
	const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

	const startDate = firstDay.toISOString().split('T')[0];
	const endDate = new Date(lastDay.getTime() + 86400000).toISOString().split('T')[0]; // +1 day for end date

	try {
		const params: GetCostAndUsageCommandInput = {
			TimePeriod: {
				Start: startDate,
				End: endDate
			},
			Granularity: 'MONTHLY',
			Metrics: ['UsageQuantity', 'BlendedCost'],
			GroupBy: [
				{
					Type: 'DIMENSION',
					Key: 'INSTANCE_TYPE'
				},
				{
					Type: 'TAG',
					Key: 'Name'
				}
			],
			Filter: {
				Dimensions: {
					Key: 'SERVICE',
					Values: ['Amazon Elastic Compute Cloud - Compute']
				}
			}
		};

		const command = new GetCostAndUsageCommand(params);
		const response = await client.send(command);

		const billingMap: { [key: string]: InstanceBilling } = {};

		if (response.ResultsByTime && response.ResultsByTime.length > 0) {
			const result = response.ResultsByTime[0];

			if (result.Groups) {
				for (const group of result.Groups) {
					// Extract instance info from keys
					const instanceType = group.Keys?.[0] || '';
					const instanceName = group.Keys?.[1] || '';

					// Get usage hours and cost
					const usageHours = parseFloat(group.Metrics?.UsageQuantity?.Amount || '0');
					const cost = parseFloat(group.Metrics?.BlendedCost?.Amount || '0');

					// You'll need to map this to actual instance IDs
					// For now, we'll use instance name as key
					if (instanceName && usageHours > 0) {
						billingMap[instanceName] = {
							instanceId: instanceName,
							monthlyHours: usageHours,
							monthlyCost: cost
						};
					}
				}
			}
		}

		return billingMap;
	} catch (error) {
		console.error('Error fetching Cost Explorer data:', error);
		// Return empty map on error
		return {};
	}
}

/**
 * Get total monthly EC2 costs
 */
export async function getTotalMonthlyCost(): Promise<{ totalCost: number; totalHours: number }> {
	const client = getCostExplorerClient();

	const now = new Date();
	const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
	const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

	const startDate = firstDay.toISOString().split('T')[0];
	const endDate = new Date(lastDay.getTime() + 86400000).toISOString().split('T')[0];

	try {
		const params: GetCostAndUsageCommandInput = {
			TimePeriod: {
				Start: startDate,
				End: endDate
			},
			Granularity: 'MONTHLY',
			Metrics: ['UsageQuantity', 'BlendedCost'],
			Filter: {
				And: [
					{
						Dimensions: {
							Key: 'SERVICE',
							Values: ['Amazon Elastic Compute Cloud - Compute']
						}
					},
					{
						Dimensions: {
							Key: 'REGION',
							Values: [env.AWS_REGION || 'ap-southeast-1']
						}
					}
				]
			}
		};

		const command = new GetCostAndUsageCommand(params);
		const response = await client.send(command);

		let totalCost = 0;
		let totalHours = 0;

		if (response.ResultsByTime && response.ResultsByTime.length > 0) {
			const result = response.ResultsByTime[0];
			totalCost = parseFloat(result.Total?.BlendedCost?.Amount || '0');
			totalHours = parseFloat(result.Total?.UsageQuantity?.Amount || '0');
		}

		return { totalCost, totalHours };
	} catch (error) {
		console.error('[Cost Explorer] Error fetching total monthly cost:', error);
		return { totalCost: 0, totalHours: 0 };
	}
}
