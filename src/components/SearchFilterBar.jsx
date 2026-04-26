import { ALL_SUBCATEGORY, SUBCATEGORIES } from '../lib/constants'

function SearchFilterBar({
  searchValue,
  onSearchChange,
  subcategoryValue,
  onSubcategoryChange,
}) {
  return (
    <section className="toolbar glass panel">
      <div className="toolbar-grid">
        <div className="field">
          <label htmlFor="search-books">Search the vault</label>
          <div className="search-wrap">
            <span className="search-icon" aria-hidden="true">
              ⌕
            </span>
            <input
              id="search-books"
              className="input"
              type="search"
              placeholder="Search by title or subcategory"
              value={searchValue}
              onChange={onSearchChange}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="subcategory-filter">Filter by subcategory</label>
          <select
            id="subcategory-filter"
            className="select"
            value={subcategoryValue}
            onChange={onSubcategoryChange}
          >
            <option value={ALL_SUBCATEGORY}>{ALL_SUBCATEGORY}</option>
            {SUBCATEGORIES.map((subcategory) => (
              <option key={subcategory} value={subcategory}>
                {subcategory}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  )
}

export default SearchFilterBar
