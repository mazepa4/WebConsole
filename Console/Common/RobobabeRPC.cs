using System;

namespace Robobabe
	{

		[Serializable]
		public class RequestTenantsResponse
		{
			public bool						requestSuccess { get; set; }
			public ulong[]					allowedTenants { get; set; }
		}

		[Serializable]
		public enum AssetType
		{
			Folder = 0,
			Solution,
			Script
		}

		[Serializable]
		public class AssetViewUpdatingRequest
		{
			public ulong					tenantId { get; set; }
			public ulong					clientRevision { get; set; }
			public ushort					treeDepth { get; set; }
		}

		[Serializable]
		public class Asset
		{
			public ulong					assetId { get; set; }
			public ulong					parentId { get; set; }
			public string					assetName { get; set; }
			public AssetType				assetType { get; set; }
			public ulong					specificId { get; set; }
			public bool						hasChildren { get; set; }
		}

		[Serializable]
		public class AssetViewUpdatingResponse
		{
			public ulong					tenantId { get; set; }
			public ulong					serverRevision { get; set; }
			public Asset[]					updatedAssets { get; set; }
			public ulong[]					deletedAssets { get; set; }
		}

		[Serializable]
		public class IdentifierWithRevision
		{
			public ulong					assetId { get; set; }
			public ulong					assetRevision { get; set; }
		}

		[Serializable]
		public class RequestUpdatesResponse
		{
			public bool						requestSuccess { get; set; }
			public AssetViewUpdatingResponse	assetViewUpdates { get; set; }
		}

		public interface IRobobabeEditor
		{
			/**********************************************************************************************
				skip - how many tenants must be skipped
				limit - max quantity of returned tenants
				return - {
					requestSuccess - success of operation
					allowedTenants - list of tenant identifiers
				}
			*/
			RequestTenantsResponse RequestTenants(uint skip, uint limit);

			/**********************************************************************************************
				tenantId - tenant identifier
				return - success of operation
			*/
			bool InstallTenant(ulong tenantId);

			/**********************************************************************************************
				tenantId - tenant identifier
				return - success of operation
			*/
			bool UninstallTenant(ulong tenantId);

			/**********************************************************************************************
				tenantId - tenant identifier
				parentId - parent asset or 0 to bind to tenant root in assets view
				assetType - type of adding asset, one of AssetType members
				assetName - name of adding asset
				return - success of operation
			*/
			bool CreateAsset(ulong tenantId, ulong parentId, AssetType assetType, string assetName);

			/**********************************************************************************************
				tenantId - tenant identifier
				assetId - identifier of deleting asset
				return - success of operation
			*/
			bool DeleteAsset(ulong tenantId, ulong assetId);

			/**********************************************************************************************
				tenantId - tenant identifier
				assetId - identifier of renaming asset
				assetName - new asset name
				return - success of operation
			*/
			bool RenameAsset(ulong tenantId, ulong assetId, string assetName);

			/**********************************************************************************************
				tenantId - tenant identifier
				assetId - identifier of moving asset
				parentId - new parent of moving asset
				return - success of operation
			*/
			bool MoveAsset(ulong tenantId, ulong assetId, ulong parentId);

			/**********************************************************************************************
				destTenantId - asset receiver identifier
				sourceTenantId - asset holder identifier
				assetId - identifier of operating asset
				return - success of operation
			*/
			bool MakeAssetReference(ulong destTenantId, ulong sourceTenantId, ulong assetId);

			/**********************************************************************************************
				destTenantId - asset receiver identifier
				sourceTenantId - asset giver identifier
				assetId - identifier of operating asset
				return - success of operation
			*/
			bool TransferAssetOwnership(ulong destTenantId, ulong sourceTenantId, ulong assetId);

			/**********************************************************************************************
				tenantId - tenant identifier
				assetListeners - list of closing listeners
				return - success of operation
			*/
			bool ForceCloseListeners(IdentifierWithRevision[] assetListeners);

			/**********************************************************************************************
				assetViewRequests - list of requested assets views, one asset view per tenant
				assetRequests - list of requested assets updates, independently of tenants
				return - {
					requestSuccess - success of operation
					assetViewUpdates - list of asset view updates
				}
			*/
			RequestUpdatesResponse RequestUpdates(AssetViewUpdatingRequest[] assetViewRequests, IdentifierWithRevision[] assetRequests);
		}
	}
