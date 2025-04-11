flowchart TB
    subgraph client["Frontend (React)"]
        UI["Giao diện người dùng"]
        APIService["API Service"]
        Router["React Router"]
        Auth["Xác thực"]
    end
    
    subgraph server["Backend (Node.js)"]
        Express["Express API"]
        MongoDB[(MongoDB)]
        AMI["Asterisk Manager\nInterface"]
        Config["Xử lý cấu hình Asterisk"]
    end
    
    subgraph asterisk["Asterisk PBX"]
        AsteriskCore["Asterisk Core"]
        ConfigFiles["Tệp Cấu hình"]
        AMIAPI["AMI API"]
    end
    
    UI --> Router
    UI --> APIService
    APIService --> Express
    
    Express --> MongoDB
    Express --> AMI
    Express --> Config
    
    AMI --> AMIAPI
    Config --> ConfigFiles
    AMIAPI --> AsteriskCore
    ConfigFiles --> AsteriskCore
    
    subgraph endpoints["API Endpoints"]
        direction LR
        Extensions["Extensions"]
        Trunks["Trunks"]
        Queues["Queues"]
        Routes["Routes"]
        CDR["CDR"]
        System["System"]
    end
    
    Express --> endpoints
    
    subgraph frontend["React Components"]
        direction LR
        Dashboard["Dashboard"]
        ExtensionsMgmt["Extensions\nManagement"]
        TrunksMgmt["Trunks\nManagement"]
        QueuesMgmt["Queues\nManagement"]
        RoutesMgmt["Routes\nManagement"]
        CDRView["CDR Viewer"]
        SystemMgmt["System\nManagement"]
    end
    
    UI --> frontend
    
    %% Liên kết giữa Frontend và Backend
    ExtensionsMgmt -.-> Extensions
    TrunksMgmt -.-> Trunks
    QueuesMgmt -.-> Queues
    RoutesMgmt -.-> Routes
    CDRView -.-> CDR
    SystemMgmt -.-> System
    Dashboard -.-> System
    
    classDef serverClass fill:#f9f9f9,stroke:#333,stroke-width:1px;
    classDef clientClass fill:#e6f7ff,stroke:#333,stroke-width:1px;
    classDef asteriskClass fill:#ffef96,stroke:#333,stroke-width:1px;
    
    class client clientClass;
    class server serverClass;
    class asterisk asteriskClass;