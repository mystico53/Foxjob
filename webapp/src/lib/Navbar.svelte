<!-- C:\coding\jobmatch-extension\webapp\src\lib\Navbar.svelte -->
<script>
    import { page } from '$app/stores';
</script>

<nav>
    <ul>
        <li class:active={$page.url.pathname === '/list'}>
            <a href="/list">List</a>
        </li>
        <li class:active={$page.url.pathname === '/cards'}>
            <a href="/cards">Cards</a>
        </li>
        <li class:active={$page.url.pathname === '/match'}>
            <a href="/match">Match</a>
        </li>
        <li class:active={$page.url.pathname === '/workflow'}>
            <a href="/workflow">Workflow</a>
        </li>
    </ul>
</nav>

<style>
    nav {
        background-color: #333;
        padding: 10px;
    }

    ul {
        list-style-type: none;
        margin: 0;
        padding: 0;
        display: flex;
    }

    li {
        margin-right: 20px;
    }

    a {
        color: white;
        text-decoration: none;
        font-weight: bold;
    }

    .active a {
        color: #ffa500;
    }
</style>