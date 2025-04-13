function showPage(pageId) {
    // Update active sidebar item
    const menuItems = document.querySelectorAll('.sidebar li');
    menuItems.forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');
  
    // Show selected page
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
  
    // Load data for the page
    if (pageId === 'dashboard') {
      loadDashboardData();
      loadRecentData();
    } else if (pageId === 'shops') {
      loadShopsData();
    } else if (pageId === 'tenants') {
      loadTenantsData();
    } else if (pageId === 'leases') {
      loadLeasesData();
    } else if (pageId === 'maintenance') {
      loadMaintenanceData();
    }
  }
  
  // Function to load dashboard data
  function loadDashboardData() {
    fetch('/api/dashboard')
      .then(response => response.json())
      .then(data => {
        document.getElementById('total-shops').textContent = data.total_shops;
        document.getElementById('occupied-shops').textContent = data.occupied_shops;
        document.getElementById('total-tenants').textContent = data.total_tenants;
        document.getElementById('pending-maintenance').textContent = data.pending_maintenance;
      })
      .catch(error => {
        console.error('Error loading dashboard data:', error);
        document.getElementById('total-shops').textContent = 'Error';
        document.getElementById('occupied-shops').textContent = 'Error';
        document.getElementById('total-tenants').textContent = 'Error';
        document.getElementById('pending-maintenance').textContent = 'Error';
      });
  }
  
  // Function to load recent data for dashboard
  function loadRecentData() {
    // Load recent leases
    fetch('/api/leases')
      .then(response => response.json())
      .then(leases => {
        const recentLeasesContainer = document.getElementById('recent-leases');
        recentLeasesContainer.innerHTML = '';
        
        if (leases.length === 0) {
          recentLeasesContainer.innerHTML = '<p>No lease data available.</p>';
        } else {
          // Display up to 3 most recent leases
          const sortedLeases = leases.sort((a, b) => new Date(b.start_date) - new Date(a.start_date)).slice(0, 3);
          sortedLeases.forEach(lease => {
            const leaseItem = document.createElement('div');
            leaseItem.className = 'item';
            leaseItem.innerHTML = `
              <div class="item-title">${lease.tenant_name} - ${lease.shop_name}</div>
              <div class="item-details">
                <span>From: ${lease.start_date}</span>
                <span>To: ${lease.end_date}</span>
                <span class="status ${lease.status.toLowerCase()}">${lease.status}</span>
              </div>
            `;
            recentLeasesContainer.appendChild(leaseItem);
          });
        }
      })
      .catch(error => {
        console.error('Error loading recent leases:', error);
        document.getElementById('recent-leases').innerHTML = '<p>Error loading lease data.</p>';
      });
    
    // Load maintenance alerts
    fetch('/api/maintenance')
      .then(response => response.json())
      .then(maintenance => {
        const maintenanceAlertsContainer = document.getElementById('maintenance-alerts');
        maintenanceAlertsContainer.innerHTML = '';
        
        if (maintenance.length === 0) {
          maintenanceAlertsContainer.innerHTML = '<p>No maintenance requests.</p>';
        } else {
          // Filter pending or in-progress maintenance requests and show top 3
          const pendingMaintenance = maintenance
            .filter(req => req.status === 'Pending' || req.status === 'In Progress')
            .sort((a, b) => {
              // Sort by priority: High, Medium, Low
              const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
              return priorityOrder[a.priority] - priorityOrder[b.priority];
            })
            .slice(0, 3);
          
          pendingMaintenance.forEach(req => {
            const maintenanceItem = document.createElement('div');
            maintenanceItem.className = 'item';
            maintenanceItem.innerHTML = `
              <div class="item-title">${req.shop_name}</div>
              <div class="item-details">
                <span>${req.description}</span>
                <span class="priority ${req.priority.toLowerCase()}">${req.priority}</span>
                <span class="status ${req.status.toLowerCase().replace(' ', '-')}">${req.status}</span>
              </div>
            `;
            maintenanceAlertsContainer.appendChild(maintenanceItem);
          });
        }
      })
      .catch(error => {
        console.error('Error loading maintenance alerts:', error);
        document.getElementById('maintenance-alerts').innerHTML = '<p>Error loading maintenance data.</p>';
      });
  }
  
  // Function to load shops data
  function loadShopsData() {
    fetch('/api/shops')
      .then(response => response.json())
      .then(shops => {
        const tableBody = document.getElementById('shops-table-body');
        tableBody.innerHTML = '';
        
        if (shops.length === 0) {
          const row = tableBody.insertRow();
          const cell = row.insertCell();
          cell.colSpan = 7;
          cell.textContent = 'No shops available.';
        } else {
          // Add rows for each shop
          shops.forEach(shop => {
            const row = tableBody.insertRow();
            row.insertCell().textContent = shop.id;
            row.insertCell().textContent = shop.name;
            row.insertCell().textContent = shop.location || 'N/A';
            row.insertCell().textContent = shop.size ? shop.size.toFixed(2) : 'N/A';
            row.insertCell().textContent = shop.rent ? `$${shop.rent.toFixed(2)}` : 'N/A';
            
            const statusCell = row.insertCell();
            statusCell.textContent = shop.status;
            statusCell.className = `status ${shop.status.toLowerCase()}`;
            
            const actionsCell = row.insertCell();
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.className = 'edit-btn';
            editButton.onclick = () => editShop(shop.id);
            actionsCell.appendChild(editButton);
            
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = 'delete-btn';
            deleteButton.onclick = () => deleteShop(shop.id, shop.name);
            actionsCell.appendChild(deleteButton);
          });
        }
      })
      .catch(error => {
        console.error('Error loading shops data:', error);
        const tableBody = document.getElementById('shops-table-body');
        tableBody.innerHTML = '';
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 7;
        cell.textContent = 'Error loading shop data.';
      });
  }
  
  // Function to load tenants data
  function loadTenantsData() {
    fetch('/api/tenants')
      .then(response => response.json())
      .then(tenants => {
        const tableBody = document.getElementById('tenants-table-body');
        tableBody.innerHTML = '';
        
        if (tenants.length === 0) {
          const row = tableBody.insertRow();
          const cell = row.insertCell();
          cell.colSpan = 7;
          cell.textContent = 'No tenants available.';
        } else {
          // Add rows for each tenant
          tenants.forEach(tenant => {
            const row = tableBody.insertRow();
            row.insertCell().textContent = tenant.id;
            row.insertCell().textContent = tenant.name;
            row.insertCell().textContent = tenant.shop_name || 'Not Assigned';
            row.insertCell().textContent = tenant.contact || '-';
            row.insertCell().textContent = tenant.email || '-';
            row.insertCell().textContent = tenant.business_type || '-';
            
            const actionsCell = row.insertCell();
            
            // Add edit button
            const editButton = document.createElement('button');
            editButton.className = 'edit-btn';
            editButton.textContent = 'Edit';
            editButton.onclick = () => editTenant(tenant.id);
            actionsCell.appendChild(editButton);
            
            // Add delete button
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-btn';
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => deleteTenant(tenant.id, tenant.name);
            actionsCell.appendChild(deleteButton);
          });
        }
      })
      .catch(error => {
        console.error('Error loading tenants data:', error);
        const tableBody = document.getElementById('tenants-table-body');
        tableBody.innerHTML = '';
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 7;
        cell.textContent = 'Error loading tenant data.';
      });
  }
  
  // Function to load leases data
  function loadLeasesData() {
    fetch('/api/leases')
      .then(response => response.json())
      .then(leases => {
        const tableBody = document.getElementById('leases-table-body');
        tableBody.innerHTML = '';
        
        if (leases.length === 0) {
          const row = tableBody.insertRow();
          const cell = row.insertCell();
          cell.colSpan = 8;
          cell.textContent = 'No leases available.';
        } else {
          // Add rows for each lease
          leases.forEach(lease => {
            const row = tableBody.insertRow();
            row.insertCell().textContent = lease.id;
            row.insertCell().textContent = lease.tenant_name;
            row.insertCell().textContent = lease.shop_name;
            row.insertCell().textContent = lease.start_date;
            row.insertCell().textContent = lease.end_date;
            row.insertCell().textContent = `$${lease.rent_amount.toFixed(2)}`;
            
            const statusCell = row.insertCell();
            statusCell.textContent = lease.status;
            statusCell.className = `status ${lease.status.toLowerCase()}`;
            
            const actionsCell = row.insertCell();
            
            // Add edit button
            const editButton = document.createElement('button');
            editButton.className = 'edit-btn';
            editButton.textContent = 'Edit';
            editButton.onclick = () => editLease(lease.id);
            actionsCell.appendChild(editButton);
            
            // Add delete button
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-btn';
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => deleteLease(lease.id);
            actionsCell.appendChild(deleteButton);
          });
        }
      })
      .catch(error => {
        console.error('Error loading leases data:', error);
        const tableBody = document.getElementById('leases-table-body');
        tableBody.innerHTML = '';
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 8;
        cell.textContent = 'Error loading lease data.';
      });
  }
  
  // Function to load maintenance data
  function loadMaintenanceData() {
    fetch('/api/maintenance')
      .then(response => response.json())
      .then(maintenanceRequests => {
        const maintenanceList = document.getElementById('maintenance-list');
        maintenanceList.innerHTML = '';
        
        if (maintenanceRequests.length === 0) {
          maintenanceList.innerHTML = '<p class="no-data">No maintenance requests available.</p>';
        } else {
          // Add items for each maintenance request
          maintenanceRequests.forEach(request => {
            const requestItem = document.createElement('div');
            requestItem.className = 'maintenance-item';
            
            // Build the status class - convert spaces to dashes and lowercase
            const statusClass = request.status.toLowerCase().replace(/\s+/g, '-');
            
            requestItem.innerHTML = `
              <div class="maintenance-header">
                <h3>${request.shop_name}</h3>
                <div class="maintenance-status ${statusClass}">${request.status}</div>
              </div>
              <div class="maintenance-details">
                <p>${request.description}</p>
                <div class="maintenance-meta">
                  <span class="maintenance-date">Reported: ${request.reported_date}</span>
                  <span class="maintenance-priority ${request.priority.toLowerCase()}">Priority: ${request.priority}</span>
                  ${request.tenant_name ? `<span class="maintenance-tenant">Tenant: ${request.tenant_name}</span>` : ''}
                </div>
                ${request.resolved_date ? 
                  `<div class="maintenance-resolution">
                    <p><strong>Resolved:</strong> ${request.resolved_date}</p>
                    ${request.resolution_notes ? `<p>${request.resolution_notes}</p>` : ''}
                  </div>` : ''}
                <div class="maintenance-actions">
                  <button class="edit-btn" onclick="editMaintenance(${request.id})">Edit</button>
                  <button class="delete-btn" onclick="deleteMaintenance(${request.id})">Delete</button>
                  ${request.status !== 'Completed' ? 
                    `<button class="complete-btn" onclick="completeMaintenance(${request.id})">Mark Complete</button>` : ''}
                </div>
              </div>
            `;
            maintenanceList.appendChild(requestItem);
          });
        }
      })
      .catch(error => {
        console.error('Error loading maintenance data:', error);
        const maintenanceList = document.getElementById('maintenance-list');
        maintenanceList.innerHTML = '<p class="error">Error loading maintenance data.</p>';
      });
  }
  
  // Function to handle maintenance status change
  function handleMaintenanceStatusChange() {
    const status = document.getElementById('maintenance-modal-status').value;
    const resolutionSection = document.getElementById('resolution-section');
    
    if (status === 'Completed') {
      resolutionSection.style.display = 'block';
      // Set default resolved date to today if not already set
      if (!document.getElementById('maintenance-modal-resolved-date').value) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        document.getElementById('maintenance-modal-resolved-date').value = today;
      }
    } else {
      resolutionSection.style.display = 'none';
    }
  }
  
  // Function to edit a maintenance request
  function editMaintenance(maintenanceId) {
    // First, load shop data for the dropdown
    fetch('/api/shops')
      .then(response => response.json())
      .then(shops => {
        const shopSelect = document.getElementById('maintenance-modal-shop');
        shopSelect.innerHTML = '';
        
        shops.forEach(shop => {
          const option = document.createElement('option');
          option.value = shop.id;
          option.textContent = shop.name;
          shopSelect.appendChild(option);
        });
        
        // Then, load the maintenance request data
        return fetch(`/api/maintenance/${maintenanceId}`);
      })
      .then(response => response.json())
      .then(maintenance => {
        // Populate form with maintenance data
        document.getElementById('maintenance-id').value = maintenance.id;
        document.getElementById('maintenance-modal-shop').value = maintenance.shop_id;
        document.getElementById('maintenance-modal-description').value = maintenance.description;
        document.getElementById('maintenance-modal-priority').value = maintenance.priority;
        document.getElementById('maintenance-modal-status').value = maintenance.status;
        
        // Handle resolved date and notes if they exist
        if (maintenance.resolved_date) {
          document.getElementById('maintenance-modal-resolved-date').value = maintenance.resolved_date.split(' ')[0]; // Just get YYYY-MM-DD part
        } else {
          document.getElementById('maintenance-modal-resolved-date').value = '';
        }
        
        document.getElementById('maintenance-modal-resolution-notes').value = maintenance.resolution_notes || '';
        
        // Show/hide resolution section based on status
        handleMaintenanceStatusChange();
        
        // Update modal title
        document.getElementById('maintenance-modal-title').textContent = `Edit Maintenance Request`;
        
        // Show modal
        document.getElementById('maintenance-modal').style.display = 'block';
      })
      .catch(error => {
        console.error('Error fetching maintenance data:', error);
        showToast('Error loading maintenance data', 'error');
      });
  }
  
  // Function to add a new maintenance request
  function showAddMaintenanceForm() {
    // Load shop data for the dropdown
    fetch('/api/shops')
      .then(response => response.json())
      .then(shops => {
        const shopSelect = document.getElementById('maintenance-modal-shop');
        shopSelect.innerHTML = '';
        
        shops.forEach(shop => {
          const option = document.createElement('option');
          option.value = shop.id;
          option.textContent = shop.name;
          shopSelect.appendChild(option);
        });
        
        // Clear form
        document.getElementById('maintenance-form').reset();
        document.getElementById('maintenance-id').value = '';
        
        // Update modal title
        document.getElementById('maintenance-modal-title').textContent = 'Add New Maintenance Request';
        
        // Show modal
        document.getElementById('maintenance-modal').style.display = 'block';
      })
      .catch(error => {
        console.error('Error loading shop data:', error);
        showToast('Error loading shop data', 'error');
      });
  }
  
  // Function to save maintenance request
  function saveMaintenance(event) {
    event.preventDefault();
    
    // Get form data
    const maintenanceId = document.getElementById('maintenance-id').value;
    const maintenanceData = {
      shop_id: document.getElementById('maintenance-modal-shop').value,
      description: document.getElementById('maintenance-modal-description').value,
      priority: document.getElementById('maintenance-modal-priority').value,
      status: document.getElementById('maintenance-modal-status').value
    };
    
    // Add resolution details if status is Completed
    if (maintenanceData.status === 'Completed') {
      maintenanceData.resolved_date = document.getElementById('maintenance-modal-resolved-date').value;
      maintenanceData.resolution_notes = document.getElementById('maintenance-modal-resolution-notes').value;
    }
    
    // Validate required fields
    if (!maintenanceData.shop_id) {
      showToast('Shop selection is required', 'error');
      return;
    }
    if (!maintenanceData.description) {
      showToast('Description is required', 'error');
      return;
    }
    
    // If maintenanceId is empty, it's a new request (POST)
    // Otherwise, it's an update (PUT)
    const method = maintenanceId ? 'PUT' : 'POST';
    const url = maintenanceId ? `/api/maintenance/${maintenanceId}` : '/api/maintenance';
    
    fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(maintenanceData)
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => {
            throw new Error(err.error || 'Unknown error occurred');
          });
        }
        return response.json();
      })
      .then(data => {
        // Close modal
        closeMaintenanceModal();
        
        // Show success message
        showToast(data.message || 'Maintenance request saved successfully', 'success');
        
        // Reload maintenance data
        loadMaintenanceData();
        
        // Also reload dashboard data 
        loadDashboardData();
      })
      .catch(error => {
        console.error('Error saving maintenance request:', error);
        showToast(error.message || 'Error saving maintenance request', 'error');
      });
  }
  
  // Function to close the maintenance modal
  function closeMaintenanceModal() {
    document.getElementById('maintenance-modal').style.display = 'none';
  }
  
  // Function to delete a maintenance request
  function deleteMaintenance(maintenanceId) {
    if (confirm('Are you sure you want to delete this maintenance request?')) {
      fetch(`/api/maintenance/${maintenanceId}`, {
        method: 'DELETE'
      })
        .then(response => {
          if (!response.ok) {
            return response.json().then(err => {
              throw new Error(err.error || 'Unknown error occurred');
            });
          }
          return response.json();
        })
        .then(data => {
          showToast(data.message || 'Maintenance request deleted successfully', 'success');
          loadMaintenanceData();
          loadDashboardData();
        })
        .catch(error => {
          console.error('Error deleting maintenance request:', error);
          showToast(error.message || 'Error deleting maintenance request', 'error');
        });
    }
  }
  
  // Function to mark a maintenance request as complete
  function completeMaintenance(maintenanceId) {
    const notes = prompt('Enter resolution notes (optional):');
    
    fetch(`/api/maintenance/${maintenanceId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        resolution_notes: notes
      })
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => {
            throw new Error(err.error || 'Unknown error occurred');
          });
        }
        return response.json();
      })
      .then(data => {
        showToast(data.message || 'Maintenance request completed successfully', 'success');
        loadMaintenanceData();
        loadDashboardData();
      })
      .catch(error => {
        console.error('Error completing maintenance request:', error);
        showToast(error.message || 'Error completing maintenance request', 'error');
      });
  }
  
  // Function to check and update expired leases
  function checkExpiredLeases() {
    fetch('/api/leases/expire-check', {
      method: 'POST'
    })
      .then(response => response.json())
      .then(data => {
        if (data.message.includes('Updated')) {
          showToast(data.message, 'info');
          loadLeasesData();
          loadTenantsData();
          loadDashboardData();
        }
      })
      .catch(error => {
        console.error('Error checking expired leases:', error);
      });
  }
  
  // Shop Modal Functions
  function editShop(shopId) {
    // Get shop data from API
    fetch(`/api/shops/${shopId}`)
      .then(response => response.json())
      .then(shop => {
        // Populate form with shop data
        document.getElementById('shop-id').value = shop.id;
        document.getElementById('shop-name').value = shop.name;
        document.getElementById('shop-location').value = shop.location || '';
        document.getElementById('shop-size').value = shop.size || '';
        document.getElementById('shop-rent').value = shop.rent || '';
        document.getElementById('shop-status').value = shop.status;
        
        // Update modal title
        document.getElementById('shop-modal-title').textContent = `Edit Shop: ${shop.name}`;
        
        // Show modal
        document.getElementById('shop-modal').style.display = 'block';
      })
      .catch(error => {
        console.error('Error fetching shop data:', error);
        showToast('Error loading shop data', 'error');
      });
  }
  
  function showAddShopForm() {
    // Clear form
    document.getElementById('shop-form').reset();
    document.getElementById('shop-id').value = '';
    
    // Update modal title
    document.getElementById('shop-modal-title').textContent = 'Add New Shop';
    
    // Show modal
    document.getElementById('shop-modal').style.display = 'block';
  }
  
  function closeShopModal() {
    document.getElementById('shop-modal').style.display = 'none';
  }
  
  function saveShop(event) {
    event.preventDefault();
    
    // Get form data
    const shopId = document.getElementById('shop-id').value;
    const shopData = {
      name: document.getElementById('shop-name').value,
      location: document.getElementById('shop-location').value,
      size: parseFloat(document.getElementById('shop-size').value) || null,
      rent: parseFloat(document.getElementById('shop-rent').value) || null,
      status: document.getElementById('shop-status').value
    };
    
    // Validate required fields
    if (!shopData.name) {
      showToast('Shop name is required', 'error');
      return;
    }
    
    // If shopId is empty, it's a new shop (POST request)
    // Otherwise, it's an update (PUT request)
    const method = shopId ? 'PUT' : 'POST';
    const url = shopId ? `/api/shops/${shopId}` : '/api/shops';
    
    fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(shopData)
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => {
            throw new Error(err.error || 'Unknown error occurred');
          });
        }
        return response.json();
      })
      .then(data => {
        // Close modal
        closeShopModal();
        
        // Show success message
        showToast(data.message || 'Shop saved successfully', 'success');
        
        // Reload shops data
        loadShopsData();
        
        // Also reload dashboard data if we're updating shops
        loadDashboardData();
      })
      .catch(error => {
        console.error('Error saving shop:', error);
        showToast(error.message || 'Error saving shop', 'error');
      });
  }
  
  function deleteShop(shopId, shopName) {
    if (confirm(`Are you sure you want to delete shop "${shopName}"?`)) {
      fetch(`/api/shops/${shopId}`, {
        method: 'DELETE'
      })
        .then(response => {
          if (!response.ok) {
            return response.json().then(err => {
              throw new Error(err.error || 'Unknown error occurred');
            });
          }
          return response.json();
        })
        .then(data => {
          // Show success message
          showToast(data.message || 'Shop deleted successfully', 'success');
          
          // Reload shops data
          loadShopsData();
          
          // Also reload dashboard data
          loadDashboardData();
        })
        .catch(error => {
          console.error('Error deleting shop:', error);
          showToast(error.message || 'Error deleting shop', 'error');
        });
    }
  }
  
  // Tenant Modal Functions
  function editTenant(tenantId) {
    // First load shop data for the dropdown
    fetch('/api/shops')
      .then(response => response.json())
      .then(shops => {
        const shopSelect = document.getElementById('tenant-modal-shop');
        shopSelect.innerHTML = '<option value="">No Shop (Unassigned)</option>';
        
        shops.forEach(shop => {
          const option = document.createElement('option');
          option.value = shop.id;
          option.textContent = shop.name;
          shopSelect.appendChild(option);
        });
        
        // Then, load the tenant data
        return fetch(`/api/tenants/${tenantId}`);
      })
      .then(response => response.json())
      .then(tenant => {
        // Populate form with tenant data
        document.getElementById('tenant-id').value = tenant.id;
        document.getElementById('tenant-modal-name').value = tenant.name;
        document.getElementById('tenant-modal-contact').value = tenant.contact || '';
        document.getElementById('tenant-modal-email').value = tenant.email || '';
        document.getElementById('tenant-modal-business').value = tenant.business_type || '';
        document.getElementById('tenant-modal-shop').value = tenant.shop_id || '';
        
        // Update modal title
        document.getElementById('tenant-modal-title').textContent = `Edit Tenant: ${tenant.name}`;
        
        // Show modal
        document.getElementById('tenant-modal').style.display = 'block';
      })
      .catch(error => {
        console.error('Error fetching tenant data:', error);
        showToast('Error loading tenant data', 'error');
      });
  }
  
  function showAddTenantForm() {
    // First load shop data for the dropdown
    fetch('/api/shops')
      .then(response => response.json())
      .then(shops => {
        const shopSelect = document.getElementById('tenant-modal-shop');
        shopSelect.innerHTML = '<option value="">No Shop (Unassigned)</option>';
        
        shops.forEach(shop => {
          if (shop.status === 'Vacant') {
            const option = document.createElement('option');
            option.value = shop.id;
            option.textContent = shop.name;
            shopSelect.appendChild(option);
          }
        });
        
        // Clear form
        document.getElementById('tenant-form').reset();
        document.getElementById('tenant-id').value = '';
        
        // Update modal title
        document.getElementById('tenant-modal-title').textContent = 'Add New Tenant';
        
        // Show modal
        document.getElementById('tenant-modal').style.display = 'block';
      })
      .catch(error => {
        console.error('Error loading shop data:', error);
        showToast('Error loading shop data', 'error');
      });
  }
  
  function closeTenantModal() {
    document.getElementById('tenant-modal').style.display = 'none';
  }
  
  function saveTenant(event) {
    event.preventDefault();
    
    // Get form data
    const tenantId = document.getElementById('tenant-id').value;
    const tenantData = {
      name: document.getElementById('tenant-modal-name').value,
      contact: document.getElementById('tenant-modal-contact').value,
      email: document.getElementById('tenant-modal-email').value,
      business_type: document.getElementById('tenant-modal-business').value,
      shop_id: document.getElementById('tenant-modal-shop').value || null
    };
    
    // Validate required fields
    if (!tenantData.name) {
      showToast('Tenant name is required', 'error');
      return;
    }
    
    // If tenantId is empty, it's a new tenant (POST request)
    // Otherwise, it's an update (PUT request)
    const method = tenantId ? 'PUT' : 'POST';
    const url = tenantId ? `/api/tenants/${tenantId}` : '/api/tenants';
    
    fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tenantData)
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => {
            throw new Error(err.error || 'Unknown error occurred');
          });
        }
        return response.json();
      })
      .then(data => {
        // Close modal
        closeTenantModal();
        
        // Show success message
        showToast(data.message || 'Tenant saved successfully', 'success');
        
        // Reload tenants and shops data
        loadTenantsData();
        loadShopsData();
        loadDashboardData();
      })
      .catch(error => {
        console.error('Error saving tenant:', error);
        showToast(error.message || 'Error saving tenant', 'error');
      });
  }
  
  function deleteTenant(tenantId, tenantName) {
    if (confirm(`Are you sure you want to delete tenant "${tenantName}"? This will also delete all associated leases.`)) {
      fetch(`/api/tenants/${tenantId}`, {
        method: 'DELETE'
      })
        .then(response => {
          if (!response.ok) {
            return response.json().then(err => {
              throw new Error(err.error || 'Unknown error occurred');
            });
          }
          return response.json();
        })
        .then(data => {
          showToast(data.message || 'Tenant deleted successfully', 'success');
          loadTenantsData();
          loadShopsData();
          loadLeasesData();
          loadDashboardData();
        })
        .catch(error => {
          console.error('Error deleting tenant:', error);
          showToast(error.message || 'Error deleting tenant', 'error');
        });
    }
  }
  
  // Lease Modal Functions
  function showAddLeaseForm() {
    Promise.all([
      fetch('/api/tenants').then(response => response.json()),
      fetch('/api/shops').then(response => response.json())
    ])
      .then(([tenants, shops]) => {
        // Populate tenant dropdown
        const tenantSelect = document.getElementById('lease-modal-tenant');
        tenantSelect.innerHTML = '';
        
        tenants.forEach(tenant => {
          const option = document.createElement('option');
          option.value = tenant.id;
          option.textContent = tenant.name;
          tenantSelect.appendChild(option);
        });
        
        // Populate shop dropdown
        const shopSelect = document.getElementById('lease-modal-shop');
        shopSelect.innerHTML = '';
        
        shops.forEach(shop => {
          // Only show shops that are Vacant or where tenant already assigned
          const option = document.createElement('option');
          option.value = shop.id;
          option.textContent = shop.name;
          shopSelect.appendChild(option);
        });
        
        // Clear form
        document.getElementById('lease-form').reset();
        document.getElementById('lease-id').value = '';
        
        // Set default dates (today and one year from today)
        const today = new Date();
        const nextYear = new Date(today);
        nextYear.setFullYear(today.getFullYear() + 1);
        
        document.getElementById('lease-modal-start').value = today.toISOString().split('T')[0];
        document.getElementById('lease-modal-end').value = nextYear.toISOString().split('T')[0];
        
        // Update modal title
        document.getElementById('lease-modal-title').textContent = 'Add New Lease';
        
        // Show modal
        document.getElementById('lease-modal').style.display = 'block';
      })
      .catch(error => {
        console.error('Error loading data for lease form:', error);
        showToast('Error loading data for lease form', 'error');
      });
  }
  
  function editLease(leaseId) {
    Promise.all([
      fetch('/api/tenants').then(response => response.json()),
      fetch('/api/shops').then(response => response.json()),
      fetch(`/api/leases/${leaseId}`).then(response => response.json())
    ])
      .then(([tenants, shops, lease]) => {
        // Populate tenant dropdown
        const tenantSelect = document.getElementById('lease-modal-tenant');
        tenantSelect.innerHTML = '';
        
        tenants.forEach(tenant => {
          const option = document.createElement('option');
          option.value = tenant.id;
          option.textContent = tenant.name;
          tenantSelect.appendChild(option);
        });
        
        // Populate shop dropdown
        const shopSelect = document.getElementById('lease-modal-shop');
        shopSelect.innerHTML = '';
        
        shops.forEach(shop => {
          const option = document.createElement('option');
          option.value = shop.id;
          option.textContent = shop.name;
          shopSelect.appendChild(option);
        });
        
        // Populate form with lease data
        document.getElementById('lease-id').value = lease.id;
        document.getElementById('lease-modal-tenant').value = lease.tenant_id;
        document.getElementById('lease-modal-shop').value = lease.shop_id;
        document.getElementById('lease-modal-start').value = lease.start_date;
        document.getElementById('lease-modal-end').value = lease.end_date;
        document.getElementById('lease-modal-rent').value = lease.rent_amount;
        document.getElementById('lease-modal-status').value = lease.status;
        
        // Update modal title
        document.getElementById('lease-modal-title').textContent = 'Edit Lease';
        
        // Show modal
        document.getElementById('lease-modal').style.display = 'block';
      })
      .catch(error => {
        console.error('Error loading lease data:', error);
        showToast('Error loading lease data', 'error');
      });
  }
  
  function closeLeaseModal() {
    document.getElementById('lease-modal').style.display = 'none';
  }
  
  function saveLease(event) {
    event.preventDefault();
    
    // Get form data
    const leaseId = document.getElementById('lease-id').value;
    const leaseData = {
      tenant_id: document.getElementById('lease-modal-tenant').value,
      shop_id: document.getElementById('lease-modal-shop').value,
      start_date: document.getElementById('lease-modal-start').value,
      end_date: document.getElementById('lease-modal-end').value,
      rent_amount: parseFloat(document.getElementById('lease-modal-rent').value),
      status: document.getElementById('lease-modal-status').value
    };
    
    // Validate required fields
    if (!leaseData.tenant_id) {
      showToast('Tenant is required', 'error');
      return;
    }
    if (!leaseData.shop_id) {
      showToast('Shop is required', 'error');
      return;
    }
    if (!leaseData.start_date) {
      showToast('Start date is required', 'error');
      return;
    }
    if (!leaseData.end_date) {
      showToast('End date is required', 'error');
      return;
    }
    if (!leaseData.rent_amount || isNaN(leaseData.rent_amount)) {
      showToast('Valid rent amount is required', 'error');
      return;
    }
    
    // Check if end date is after start date
    const startDate = new Date(leaseData.start_date);
    const endDate = new Date(leaseData.end_date);
    if (endDate <= startDate) {
      showToast('End date must be after start date', 'error');
      return;
    }
    
    // If leaseId is empty, it's a new lease (POST request)
    // Otherwise, it's an update (PUT request)
    const method = leaseId ? 'PUT' : 'POST';
    const url = leaseId ? `/api/leases/${leaseId}` : '/api/leases';
    
    fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(leaseData)
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => {
            throw new Error(err.error || 'Unknown error occurred');
          });
        }
        return response.json();
      })
      .then(data => {
        // Close modal
        closeLeaseModal();
        
        // Show success message
        showToast(data.message || 'Lease saved successfully', 'success');
        
        // Reload data
        loadLeasesData();
        loadTenantsData();
        loadShopsData();
        loadDashboardData();
      })
      .catch(error => {
        console.error('Error saving lease:', error);
        showToast(error.message || 'Error saving lease', 'error');
      });
  }
  
  function deleteLease(leaseId) {
    if (confirm('Are you sure you want to delete this lease?')) {
      fetch(`/api/leases/${leaseId}`, {
        method: 'DELETE'
      })
        .then(response => {
          if (!response.ok) {
            return response.json().then(err => {
              throw new Error(err.error || 'Unknown error occurred');
            });
          }
          return response.json();
        })
        .then(data => {
          showToast(data.message || 'Lease deleted successfully', 'success');
          loadLeasesData();
          loadTenantsData();
          loadShopsData();
          loadDashboardData();
        })
        .catch(error => {
          console.error('Error deleting lease:', error);
          showToast(error.message || 'Error deleting lease', 'error');
        });
    }
  }
  
  // Toast notification function
  function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast';
    toast.classList.add(type);
    toast.style.display = 'block';
    
    // Auto hide after 3 seconds
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3000);
  }
  
  // Close modal if user clicks outside of it
  window.onclick = function(event) {
    const modal = document.getElementById('shop-modal');
    if (event.target === modal) {
      closeShopModal();
    }
  }
  
  // Initialize
  document.addEventListener('DOMContentLoaded', function() {
    // Load initial data
    loadDashboardData();
    loadRecentData();
    
    // Check for expired leases on page load
    checkExpiredLeases();
    
    // Set up interval to check for expired leases every hour
    setInterval(checkExpiredLeases, 3600000);
  });
  