const SortableHeader = ({ label, sortKey, currentSort, onSort, className = '' }) => {
  const isActive = currentSort.key === sortKey;
  const direction = currentSort.direction;
  
  const handleClick = () => {
    onSort(sortKey);
  };
  
  return (
    <th 
      className={`px-4 py-3 text-left text-sm font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100 transition-colors ${className}`}
      onClick={handleClick}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        <span className={`flex flex-col ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
          <svg 
            className={`w-3 h-3 transition-transform ${isActive && direction === 'asc' ? 'text-indigo-600' : ''}`} 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          <svg 
            className={`w-3 h-3 -mt-1 transition-transform ${isActive && direction === 'desc' ? 'text-indigo-600' : ''}`} 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </div>
    </th>
  );
};

export default SortableHeader;
