$endpoint = "https://wijabqjyrylediitcrc.hasura.eu-central-1.nhost.run/v1/metadata"
$adminSecret = "YOUR_ADMIN_SECRET"

$tables = @(
  @{ name = "stores"; },
  @{ name = "user_roles"; },
  @{ name = "expiry_batches"; },
  @{ name = "customers"; },
  @{ name = "sales"; }
)

$role = "system_admin"
$args_list = @()

foreach ($t in $tables) {
  $tableName = $t.name

  $args_list += @{
    type = "pg_create_insert_permission"
    args = @{
      source = "default"
      table = @{ schema = "public"; name = $tableName }
      role = $role
      permission = @{ check = @{}; columns = "*" }
    }
  }
  $args_list += @{
    type = "pg_create_select_permission"
    args = @{
      source = "default"
      table = @{ schema = "public"; name = $tableName }
      role = $role
      permission = @{ columns = "*"; filter = @{}; allow_aggregations = $true }
    }
  }
  $args_list += @{
    type = "pg_create_update_permission"
    args = @{
      source = "default"
      table = @{ schema = "public"; name = $tableName }
      role = $role
      permission = @{ columns = "*"; filter = @{}; check = @{} }
    }
  }
  $args_list += @{
    type = "pg_create_delete_permission"
    args = @{
      source = "default"
      table = @{ schema = "public"; name = $tableName }
      role = $role
      permission = @{ filter = @{} }
    }
  }
}

$body = @{
  type = "bulk"
  args = $args_list
} | ConvertTo-Json -Depth 10

$headers = @{
  "x-hasura-admin-secret" = $adminSecret
  "Content-Type" = "application/json"
}

$response = Invoke-RestMethod -Uri $endpoint -Method Post -Body $body -Headers $headers
$response | ConvertTo-Json -Depth 10